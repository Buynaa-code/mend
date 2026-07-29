import { getAppBindings, getDb } from "../../../db";
import { cleanEmail, isValidEmail } from "../../lib/server/draft";
import {
  deriveRecoveryToken,
  jsonError,
} from "../../lib/server/payments";
import {
  enforceRateLimit,
  RateLimitError,
} from "../../lib/server/security";

type RecoveryRow = {
  id: string;
  order_id: string;
  owner_email: string;
};

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "payment-recovery", 4, 30 * 60_000);
    const payload = (await request.json()) as {
      email?: string;
      orderId?: string;
    };
    const email = cleanEmail(payload.email ?? "");
    const orderId = String(payload.orderId ?? "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 40);
    if (!isValidEmail(email) || !orderId) {
      return jsonError("Email болон order ID-гаа зөв оруулна уу.", 400);
    }

    const db = await getDb();
    const payment = await db
      .prepare(`
        SELECT p.id, p.order_id, d.owner_email
        FROM payments p
        JOIN drafts d ON d.id = p.draft_id
        WHERE p.order_id = ? AND d.owner_email = ?
        LIMIT 1
      `)
      .bind(orderId, email)
      .first<RecoveryRow>();
    if (payment) {
      const bindings = await getAppBindings();
      const origin =
        bindings.PUBLIC_APP_URL?.replace(/\/+$/, "") ||
        new URL(request.url).origin;
      const recoveryToken = await deriveRecoveryToken(payment.id, email);
      const recoveryUrl = new URL("/pay", origin);
      recoveryUrl.searchParams.set("payment", payment.id);
      recoveryUrl.searchParams.set("recovery", recoveryToken);
      await db
        .prepare(`
          INSERT INTO notifications (
            id, type, email, payload_json, status, created_at, sent_at
          ) VALUES (?, 'payment_recovery', ?, ?, 'queued', ?, NULL)
        `)
        .bind(
          crypto.randomUUID(),
          email,
          JSON.stringify({
            orderId: payment.order_id,
            paymentId: payment.id,
            recoveryUrl: recoveryUrl.toString(),
          }),
          new Date().toISOString(),
        )
        .run();
    }

    return Response.json({
      ok: true,
      message:
        "Мэдээлэл таарсан бол сэргээх холбоосыг email-р илгээнэ.",
    });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Сэргээх хүсэлт илгээж чадсангүй.";
    return jsonError(message, 500);
  }
}

