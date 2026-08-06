import { ensureSchema } from "../../../../db";
import {
  deriveAdminToken,
  isAdminEmail,
  normalizeEmail,
} from "../../../lib/server/admin";
import { jsonError } from "../../../lib/server/payments";
import { enforceRateLimit, RateLimitError } from "../../../lib/server/security";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "admin-login", 10, 15 * 60_000);

    const payload = (await request.json()) as { email?: string };
    const email = normalizeEmail(String(payload.email ?? ""));
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Email форматаа шалгана уу.", 400);
    }
    if (!(await isAdminEmail(email))) {
      return jsonError("Энэ email админ биш байна.", 403);
    }
    const token = await deriveAdminToken(email);
    return Response.json({ email, token });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Нэвтэрч чадсангүй.";
    return jsonError(message, 500);
  }
}
