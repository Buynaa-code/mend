import { getDb } from "../../../db";
import { type GreetingDraft } from "../../lib/greeting";
import { cleanDraft, validateDraft } from "../../lib/server/draft";
import {
  deriveOwnerToken,
  getAccessCode,
  jsonError,
  PaymentAccessError,
  requirePaymentAccess,
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
};

function createSlug() {
  return `mend-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { paymentId?: string };
    const paymentId = String(payload.paymentId ?? "").trim();
    if (!paymentId) return jsonError("Захиалгын ID дутуу байна.", 400);
    await enforceRateLimit(request, `publish:${paymentId}`, 10, 15 * 60_000);

    const access = await requirePaymentAccess(request, paymentId);
    if (access.payment.status !== "succeeded") {
      return jsonError("Төлбөр backend дээр баталгаажаагүй байна.", 402);
    }

    const db = await getDb();
    const existing = await db
      .prepare(`
        SELECT g.id, g.public_slug, g.recipient_name
        FROM greeting_private gp
        JOIN greetings g ON g.id = gp.greeting_id
        WHERE gp.payment_id = ?
        LIMIT 1
      `)
      .bind(paymentId)
      .first<ExistingPublication>();
    const ownerToken = await deriveOwnerToken(paymentId);
    if (existing) {
      return Response.json({
        id: existing.id,
        publicSlug: existing.public_slug,
        recipientName: existing.recipient_name,
        ownerToken,
      });
    }

    const code = await getAccessCode(paymentId);
    if (!code || !["issued", "valid"].includes(code.status)) {
      return jsonError("Нийтлэх нэг удаагийн эрх бэлэн биш байна.", 409);
    }
    if (code.expires_at && Date.parse(code.expires_at) <= Date.now()) {
      await db
        .prepare(
          "UPDATE access_codes SET status = 'expired' WHERE id = ? AND status IN ('issued', 'valid')",
        )
        .bind(code.id)
        .run();
      return jsonError("Нийтлэх эрхийн хугацаа дууссан байна.", 410);
    }

    const storedDraft = await db
      .prepare("SELECT content_json, owner_email FROM drafts WHERE id = ? LIMIT 1")
      .bind(access.payment.draft_id)
      .first<DraftRow>();
    if (!storedDraft) return jsonError("Ноорог олдсонгүй.", 404);

    let draft: GreetingDraft;
    try {
      draft = cleanDraft(JSON.parse(storedDraft.content_json) as GreetingDraft);
    } catch {
      return jsonError("Ноорог гэмтсэн байна.", 500);
    }
    const validationError = validateDraft(draft);
    if (validationError) return jsonError(validationError, 400);

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
              sender_name, template, headline, message, surprise_message,
              music_url, music_name, photos_json, birthday_date, opened_at,
              view_count, created_at, updated_at
            )
            SELECT ?, ?, ac.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?
            FROM access_codes ac
            WHERE ac.id = ? AND ac.payment_id = ?
              AND ac.status IN ('issued', 'valid') AND ac.used_at IS NULL
              AND (ac.expires_at IS NULL OR ac.expires_at > ?)
          `)
          .bind(
            greetingId,
            ownerTokenHash,
            publicSlug,
            draft.recipientName,
            draft.senderName,
            draft.template,
            headline,
            draft.message,
            draft.surpriseMessage,
            draft.musicUrl,
            draft.musicName,
            JSON.stringify(draft.photos),
            draft.birthdayDate,
            now,
            now,
            code.id,
            paymentId,
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
            storedDraft.owner_email,
            ownerTokenHash,
            paymentId,
            now,
            greetingId,
          ),
        db
          .prepare(`
            UPDATE access_codes
            SET status = 'used', used_at = ?, greeting_id = ?
            WHERE id = ? AND payment_id = ? AND status IN ('issued', 'valid')
              AND used_at IS NULL
              AND EXISTS (SELECT 1 FROM greetings WHERE id = ?)
          `)
          .bind(now, greetingId, code.id, paymentId, greetingId),
        db
          .prepare(
            "UPDATE drafts SET status = 'published' WHERE id = ? AND EXISTS (SELECT 1 FROM greetings WHERE id = ?)",
          )
          .bind(access.payment.draft_id, greetingId),
        db
          .prepare(`
            INSERT INTO notifications (
              id, type, email, payload_json, status, created_at, sent_at
            )
            SELECT ?, 'greeting_published', ?, ?, 'queued', ?, NULL
            WHERE EXISTS (SELECT 1 FROM greetings WHERE id = ?)
          `)
          .bind(
            crypto.randomUUID(),
            storedDraft.owner_email,
            JSON.stringify({
              paymentId,
              orderId: access.payment.order_id,
              code: code.code,
              publicSlug,
            }),
            now,
            greetingId,
          ),
      ]);
      const changes = Number(
        (results[0].meta as { changes?: number } | undefined)?.changes ?? 0,
      );
      if (!changes) {
        return jsonError("Энэ эрх аль хэдийн ашиглагдсан байна.", 409);
      }
    } catch {
      const raced = await db
        .prepare(`
          SELECT g.id, g.public_slug, g.recipient_name
          FROM greeting_private gp
          JOIN greetings g ON g.id = gp.greeting_id
          WHERE gp.payment_id = ?
          LIMIT 1
        `)
        .bind(paymentId)
        .first<ExistingPublication>();
      if (raced) {
        return Response.json({
          id: raced.id,
          publicSlug: raced.public_slug,
          recipientName: raced.recipient_name,
          ownerToken,
        });
      }
      return jsonError("Нийтлэх эрхийг зарцуулж чадсангүй.", 409);
    }

    return Response.json(
      {
        id: greetingId,
        publicSlug,
        recipientName: draft.recipientName,
        ownerToken,
      },
      { status: 201 },
    );
  } catch (caught) {
    if (caught instanceof PaymentAccessError) {
      return jsonError(caught.message, caught.status);
    }
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Мэндчилгээ нийтэлж чадсангүй.";
    return jsonError(message, 500);
  }
}

