import { ensureSchema, getAppBindings, getDb } from "../../../../db";
import { cleanEmail, isValidEmail } from "../../../lib/server/draft";
import {
  deriveDraftToken,
  jsonError,
} from "../../../lib/server/payments";
import {
  enforceRateLimit,
  RateLimitError,
} from "../../../lib/server/security";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "draft-resume", 5, 60 * 60_000);

    const payload = (await request.json()) as { email?: string };
    const email = cleanEmail(payload.email ?? "");
    if (!isValidEmail(email)) return jsonError("Email формат буруу.", 400);

    const db = await getDb();
    const latest = await db
      .prepare(`
        SELECT id FROM drafts
        WHERE owner_email = ?
          AND status = 'in_progress'
          AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .bind(email, new Date().toISOString())
      .first<{ id: string }>();

    if (latest) {
      const bindings = await getAppBindings();
      const origin =
        bindings.PUBLIC_APP_URL?.replace(/\/+$/, "") ||
        new URL(request.url).origin;
      const token = await deriveDraftToken(latest.id, email);
      const resumeUrl = new URL("/create", origin);
      resumeUrl.searchParams.set("resume", latest.id);
      resumeUrl.searchParams.set("token", token);
      resumeUrl.searchParams.set("e", email);

      await db
        .prepare(`
          INSERT INTO notifications (
            id, type, email, payload_json, status, created_at, sent_at
          ) VALUES (?, 'draft_resume', ?, ?, 'queued', ?, NULL)
        `)
        .bind(
          crypto.randomUUID(),
          email,
          JSON.stringify({
            draftId: latest.id,
            resumeUrl: resumeUrl.toString(),
          }),
          new Date().toISOString(),
        )
        .run();
    }

    return Response.json({
      ok: true,
      message: "Мэдээлэл таарсан бол ноорогийн холбоосыг email-р илгээнэ.",
    });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Хүсэлт илгээж чадсангүй.";
    return jsonError(message, 500);
  }
}
