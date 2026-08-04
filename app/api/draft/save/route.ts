import { ensureSchema, getDb } from "../../../../db";
import { type GreetingDraft } from "../../../lib/greeting";
import { cleanDraft, cleanEmail, isValidEmail } from "../../../lib/server/draft";
import {
  deriveDraftToken,
  draftExpiry,
  jsonError,
} from "../../../lib/server/payments";
import {
  constantTimeEqual,
  enforceRateLimit,
  RateLimitError,
} from "../../../lib/server/security";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "draft-save", 60, 15 * 60_000);

    const payload = (await request.json()) as {
      id?: string;
      email?: string;
      token?: string;
      draft?: GreetingDraft;
    };

    const email = cleanEmail(payload.email ?? "");
    if (!isValidEmail(email)) return jsonError("Email формат буруу.", 400);
    if (!payload.draft) return jsonError("Ноорог дутуу.", 400);

    const draft = cleanDraft(payload.draft);
    const contentJson = JSON.stringify(draft);
    if (contentJson.length > 200_000) {
      return jsonError("Ноорог хэт том байна.", 413);
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const expiresAt = draftExpiry();

    const providedId = String(payload.id ?? "").trim();
    const providedToken = String(payload.token ?? "").trim();

    if (providedId) {
      const expectedToken = await deriveDraftToken(providedId, email);
      if (
        !providedToken ||
        !constantTimeEqual(providedToken, expectedToken)
      ) {
        return jsonError("Токен буруу байна.", 401);
      }
      const existing = await db
        .prepare(
          "SELECT id, status FROM drafts WHERE id = ? AND owner_email = ? LIMIT 1",
        )
        .bind(providedId, email)
        .first<{ id: string; status: string }>();
      if (!existing) return jsonError("Ноорог олдсонгүй.", 404);
      if (existing.status !== "in_progress") {
        return jsonError("Энэ ноорог аль хэдийн хэрэглэгдсэн байна.", 409);
      }
      await db
        .prepare(
          "UPDATE drafts SET content_json = ?, expires_at = ? WHERE id = ?",
        )
        .bind(contentJson, expiresAt, providedId)
        .run();
      return Response.json({ id: providedId, token: providedToken });
    }

    const draftId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO drafts (
          id, content_json, owner_email, status, created_at, expires_at
        ) VALUES (?, ?, ?, 'in_progress', ?, ?)
      `)
      .bind(draftId, contentJson, email, now, expiresAt)
      .run();
    const token = await deriveDraftToken(draftId, email);
    return Response.json({ id: draftId, token }, { status: 201 });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Ноорог хадгалж чадсангүй.";
    return jsonError(message, 500);
  }
}
