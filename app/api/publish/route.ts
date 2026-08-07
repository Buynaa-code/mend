import { ensureSchema, getDb } from "../../../db";
import {
  type GreetingDraft,
  normalizeMascot,
} from "../../lib/greeting";
import {
  findAccessCodeByCode,
  normalizeAccessCode,
} from "../../lib/server/access-codes";
import { cleanDraft, validateDraft } from "../../lib/server/draft";
import {
  deriveOwnerToken,
  jsonError,
} from "../../lib/server/payments";
import {
  enforceRateLimit,
  hashValue,
  RateLimitError,
} from "../../lib/server/security";

type DraftRow = {
  content_json: string;
  owner_email: string;
};

type ExistingPublication = {
  id: string;
  public_slug: string;
  recipient_name: string;
  /** Хуучин нэртэй багана — одоо дүрийн id хадгална. */
  recipient_gender: string;
};

function createSlug() {
  return `mend-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      code?: string;
      draft?: GreetingDraft;
    };
    const rawCode = String(payload.code ?? "").trim();
    const normalizedCode = normalizeAccessCode(rawCode);
    if (!normalizedCode) {
      return jsonError("Нэг удаагийн код дутуу байна.", 400);
    }
    await enforceRateLimit(request, `publish:${normalizedCode}`, 10, 15 * 60_000);

    const code = await findAccessCodeByCode(normalizedCode);
    if (!code) return jsonError("Кодыг олсонгүй.", 404);
    if (!["issued", "valid"].includes(code.status)) {
      if (code.status === "used") {
        return jsonError("Энэ код аль хэдийн ашиглагдсан байна.", 409);
      }
      return jsonError("Энэ кодын хүчин төгөлдөр байдал алдагдсан.", 410);
    }

    const db = await getDb();
    if (code.expires_at && Date.parse(code.expires_at) <= Date.now()) {
      await db
        .prepare(
          "UPDATE access_codes SET status = 'expired' WHERE id = ? AND status IN ('issued', 'valid')",
        )
        .bind(code.id)
        .run();
      return jsonError("Кодын хугацаа дууссан байна.", 410);
    }

    const existing = await db
      .prepare(`
        SELECT g.id, g.public_slug, g.recipient_name, g.recipient_gender
        FROM greetings g
        WHERE g.access_code_id = ?
        LIMIT 1
      `)
      .bind(code.id)
      .first<ExistingPublication>();
    const ownerToken = await deriveOwnerToken(code.payment_id);
    if (existing) {
      return Response.json({
        id: existing.id,
        publicSlug: existing.public_slug,
        recipientName: existing.recipient_name,
        mascot: normalizeMascot(existing.recipient_gender),
        ownerToken,
      });
    }

    let draft: GreetingDraft | null = null;
    if (payload.draft) {
      try {
        draft = cleanDraft(payload.draft);
      } catch {
        return jsonError("Мэндчилгээ буруу форматтай байна.", 400);
      }
    } else if (code.source === "paid") {
      const storedDraft = await db
        .prepare("SELECT content_json, owner_email FROM drafts WHERE id = ? LIMIT 1")
        .bind(await draftIdForPayment(code.payment_id))
        .first<DraftRow>();
      if (!storedDraft) return jsonError("Хадгалсан ноорог олдсонгүй.", 404);
      try {
        draft = cleanDraft(JSON.parse(storedDraft.content_json) as GreetingDraft);
      } catch {
        return jsonError("Ноорог гэмтсэн байна.", 500);
      }
    }
    if (!draft) {
      return jsonError("Нийтлэх мэндчилгээгээ илгээнэ үү.", 400);
    }
    const validationError = validateDraft(draft);
    if (validationError) return jsonError(validationError, 400);

    const draftForOwner = await db
      .prepare("SELECT owner_email FROM drafts WHERE id = ? LIMIT 1")
      .bind(await draftIdForPayment(code.payment_id))
      .first<{ owner_email: string }>();
    const ownerEmail = draftForOwner?.owner_email ?? "";

    const now = new Date().toISOString();
    const greetingId = crypto.randomUUID();
    const publicSlug = createSlug();
    const ownerTokenHash = await hashValue(ownerToken);
    const headline =
      draft.headline || `Төрсөн өдрийн мэнд, ${draft.recipientName}!`;

    try {
      const results = await db.batch([
        db
          .prepare(`
            INSERT INTO greetings (
              id, owner_token_hash, access_code_id, public_slug, recipient_name,
              recipient_gender, sender_name, template, headline, message, surprise_message,
              music_url, music_name, photos_json, birthday_date, lock_until_birthday,
              opened_at, view_count, created_at, updated_at
            )
            SELECT ?, ?, ac.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?
            FROM access_codes ac
            WHERE ac.id = ? AND ac.code = ?
              AND ac.status IN ('issued', 'valid') AND ac.used_at IS NULL
              AND (ac.expires_at IS NULL OR ac.expires_at > ?)
          `)
          .bind(
            greetingId,
            ownerTokenHash,
            publicSlug,
            draft.recipientName,
            draft.mascot,
            draft.senderName,
            draft.template,
            headline,
            draft.message,
            draft.surpriseMessage,
            draft.musicUrl,
            draft.musicName,
            JSON.stringify(draft.photos),
            draft.birthdayDate,
            draft.lockUntilBirthday ? 1 : 0,
            now,
            now,
            code.id,
            normalizedCode,
            now,
          ),
        db
          .prepare(`
            INSERT INTO greeting_private (
              greeting_id, owner_email, owner_token_hash, payment_id,
              internal_notes, created_at
            )
            SELECT ?, ?, ?, ?, '', ?
            WHERE EXISTS (SELECT 1 FROM greetings WHERE id = ?)
          `)
          .bind(
            greetingId,
            ownerEmail,
            ownerTokenHash,
            code.payment_id,
            now,
            greetingId,
          ),
        db
          .prepare(`
            UPDATE access_codes
            SET status = 'used', used_at = ?, greeting_id = ?
            WHERE id = ? AND status IN ('issued', 'valid')
              AND used_at IS NULL
              AND EXISTS (SELECT 1 FROM greetings WHERE id = ?)
          `)
          .bind(now, greetingId, code.id, greetingId),
        db
          .prepare(`
            INSERT INTO notifications (
              id, type, email, payload_json, status, created_at, sent_at
            )
            SELECT ?, 'greeting_published', ?, ?, 'queued', ?, NULL
            WHERE EXISTS (SELECT 1 FROM greetings WHERE id = ?)
              AND length(?) > 0
          `)
          .bind(
            crypto.randomUUID(),
            ownerEmail,
            JSON.stringify({
              paymentId: code.payment_id,
              code: normalizedCode,
              publicSlug,
              source: code.source,
            }),
            now,
            greetingId,
            ownerEmail,
          ),
      ]);
      const changes = Number(
        (results[0].meta as { changes?: number } | undefined)?.changes ?? 0,
      );
      if (!changes) {
        return jsonError("Энэ код аль хэдийн ашиглагдсан байна.", 409);
      }
    } catch {
      const raced = await db
        .prepare(`
          SELECT g.id, g.public_slug, g.recipient_name, g.recipient_gender
          FROM greetings g
          WHERE g.access_code_id = ?
          LIMIT 1
        `)
        .bind(code.id)
        .first<ExistingPublication>();
      if (raced) {
        return Response.json({
          id: raced.id,
          publicSlug: raced.public_slug,
          recipientName: raced.recipient_name,
          mascot: normalizeMascot(raced.recipient_gender),
          ownerToken,
        });
      }
      return jsonError("Мэндчилгээг нийтэлж чадсангүй.", 409);
    }

    return Response.json(
      {
        id: greetingId,
        publicSlug,
        recipientName: draft.recipientName,
        mascot: draft.mascot,
        ownerToken,
      },
      { status: 201 },
    );
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Мэндчилгээ нийтэлж чадсангүй.";
    return jsonError(message, 500);
  }
}

async function draftIdForPayment(paymentId: string) {
  const db = await getDb();
  const row = await db
    .prepare("SELECT draft_id FROM payments WHERE id = ? LIMIT 1")
    .bind(paymentId)
    .first<{ draft_id: string }>();
  return row?.draft_id ?? "";
}
