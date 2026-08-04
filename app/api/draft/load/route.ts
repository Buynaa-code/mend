import { ensureSchema, getDb } from "../../../../db";
import { cleanEmail, isValidEmail } from "../../../lib/server/draft";
import {
  deriveDraftToken,
  jsonError,
} from "../../../lib/server/payments";
import {
  constantTimeEqual,
  enforceRateLimit,
  RateLimitError,
} from "../../../lib/server/security";

type DraftRow = {
  content_json: string;
  status: string;
  expires_at: string;
};

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "draft-load", 30, 15 * 60_000);

    const payload = (await request.json()) as {
      id?: string;
      token?: string;
      email?: string;
    };
    const id = String(payload.id ?? "").trim();
    const email = cleanEmail(payload.email ?? "");
    const token = String(payload.token ?? "").trim();
    if (!id || !token || !isValidEmail(email)) {
      return jsonError("Мэдээлэл дутуу.", 400);
    }

    const expected = await deriveDraftToken(id, email);
    if (!constantTimeEqual(token, expected)) {
      return jsonError("Токен буруу.", 401);
    }

    const db = await getDb();
    const row = await db
      .prepare(
        "SELECT content_json, status, expires_at FROM drafts WHERE id = ? AND owner_email = ? LIMIT 1",
      )
      .bind(id, email)
      .first<DraftRow>();
    if (!row) return jsonError("Ноорог олдсонгүй.", 404);
    if (row.status !== "in_progress") {
      return jsonError("Ноорог хэрэглэгдсэн эсвэл хугацаа дууссан.", 410);
    }
    if (Date.parse(row.expires_at) <= Date.now()) {
      return jsonError("Ноорогийн хугацаа дууссан.", 410);
    }

    let draft: unknown;
    try {
      draft = JSON.parse(row.content_json);
    } catch {
      return jsonError("Ноорог гэмтсэн байна.", 500);
    }
    return Response.json({ draft });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Ноорог уншиж чадсангүй.";
    return jsonError(message, 500);
  }
}
