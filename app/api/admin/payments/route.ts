import { ensureSchema, getAppBindings, getDb } from "../../../../db";
import {
  getPayment,
  jsonError,
  markPaymentSucceeded,
} from "../../../lib/server/payments";
import {
  constantTimeEqual,
  enforceRateLimit,
  RateLimitError,
} from "../../../lib/server/security";

type PaymentLookup = {
  id: string;
  order_id: string;
  status: string;
};

function readAdminToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "admin-payment", 20, 15 * 60_000);
    const bindings = await getAppBindings();
    const expected = bindings.ADMIN_API_SECRET?.trim() ?? "";
    const supplied = readAdminToken(request);
    if (
      expected.length < 24 ||
      !supplied ||
      !constantTimeEqual(expected, supplied)
    ) {
      return jsonError("Админ эрх баталгаажсангүй.", 401);
    }

    const payload = (await request.json()) as {
      paymentId?: string;
      orderId?: string;
      action?: "approve" | "revoke" | "refund";
      note?: string;
    };
    const paymentId = String(payload.paymentId ?? "").trim();
    const orderId = String(payload.orderId ?? "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 40);
    if (!paymentId && !orderId) {
      return jsonError("Payment ID эсвэл Order ID дутуу байна.", 400);
    }
    if (!["approve", "revoke", "refund"].includes(payload.action ?? "")) {
      return jsonError("Админ үйлдэл буруу байна.", 400);
    }

    const db = await getDb();
    const lookup = paymentId
      ? await getPayment(paymentId)
      : await db
          .prepare(
            "SELECT id, order_id, status FROM payments WHERE order_id = ? LIMIT 1",
          )
          .bind(orderId)
          .first<PaymentLookup>();
    if (!lookup) return jsonError("Захиалга олдсонгүй.", 404);

    const now = new Date().toISOString();
    const eventId = `admin:${payload.action}:${lookup.id}:${crypto.randomUUID()}`;
    const note = String(payload.note ?? "").slice(0, 300);
    if (payload.action === "approve") {
      const code = await markPaymentSucceeded(lookup.id);
      await db
        .prepare(`
          INSERT INTO webhook_events (
            id, provider, event_id, payload_hash, status, created_at, processed_at
          ) VALUES (?, 'admin', ?, ?, 'processed', ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          eventId,
          note || "manual approval",
          now,
          now,
        )
        .run();
      return Response.json({
        ok: true,
        paymentId: lookup.id,
        orderId: lookup.order_id,
        code: code.code,
        codeStatus: code.status,
      });
    }

    const targetStatus = payload.action === "refund" ? "refunded" : "revoked";
    const code = await db
      .prepare(
        "SELECT id, used_at FROM access_codes WHERE payment_id = ? LIMIT 1",
      )
      .bind(lookup.id)
      .first<{ id: string; used_at: string | null }>();
    if (code?.used_at) {
      return jsonError(
        "Нийтлэгдсэн мэндчилгээний эрхийг автоматаар цуцлахгүй. Эхлээд контентын шийдвэр гаргана уу.",
        409,
      );
    }
    await db.batch([
      db
        .prepare(`
          UPDATE access_codes SET status = ?
          WHERE payment_id = ? AND used_at IS NULL
        `)
        .bind(targetStatus, lookup.id),
      db
        .prepare(`
          UPDATE payments
          SET status = 'canceled', failure_reason = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(`${targetStatus}: ${note}`.slice(0, 500), now, lookup.id),
      db
        .prepare(`
          INSERT INTO webhook_events (
            id, provider, event_id, payload_hash, status, created_at, processed_at
          ) VALUES (?, 'admin', ?, ?, 'processed', ?, ?)
        `)
        .bind(crypto.randomUUID(), eventId, note || targetStatus, now, now),
    ]);
    return Response.json({
      ok: true,
      paymentId: lookup.id,
      orderId: lookup.order_id,
      codeStatus: targetStatus,
    });
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Админ үйлдэл амжилтгүй.";
    return jsonError(message, 500);
  }
}

