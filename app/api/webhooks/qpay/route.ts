import { getDb } from "../../../../db";
import { confirmProviderPayment } from "../../../lib/server/qpay";
import {
  getPayment,
  jsonError,
  markPaymentSucceeded,
  requireAppSecret,
  signWebhook,
} from "../../../lib/server/payments";
import {
  constantTimeEqual,
  hashValue,
} from "../../../lib/server/security";

async function handleWebhook(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment")?.trim() ?? "";
  const timestamp = url.searchParams.get("ts")?.trim() ?? "";
  const signature = url.searchParams.get("sig")?.trim() ?? "";
  if (!paymentId || !timestamp || !signature) {
    return jsonError("Webhook signature дутуу байна.", 401);
  }

  await requireAppSecret();
  const timestampNumber = Number(timestamp);
  const age = Date.now() - timestampNumber * 1000;
  if (
    !Number.isFinite(timestampNumber) ||
    age < -5 * 60_000 ||
    age > 48 * 60 * 60_000
  ) {
    return jsonError("Webhook timestamp хүчингүй байна.", 401);
  }
  const expected = await signWebhook(paymentId, timestamp);
  if (!constantTimeEqual(expected, signature)) {
    return jsonError("Webhook signature буруу байна.", 401);
  }

  const payment = await getPayment(paymentId);
  if (!payment || payment.provider !== "qpay") {
    return jsonError("QPay захиалга олдсонгүй.", 404);
  }
  if (payment.status === "succeeded") {
    return Response.json({ ok: true, duplicate: true });
  }

  const body = request.method === "POST" ? await request.text() : "";
  const payloadHash = await hashValue(
    `${request.method}:${url.search}:${body}`,
  );
  let providerEventId = payloadHash;
  try {
    const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    providerEventId = String(
      parsed.payment_id ?? parsed.invoice_id ?? payloadHash,
    );
  } catch {
    providerEventId = payloadHash;
  }

  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT OR IGNORE INTO webhook_events (
        id, provider, event_id, payload_hash, status, created_at,
        signature_verified_at, processed_at
      ) VALUES (?, 'qpay', ?, ?, 'received', ?, ?, NULL)
    `)
    .bind(crypto.randomUUID(), providerEventId, payloadHash, now, now)
    .run();
  const event = await db
    .prepare(
      "SELECT id, status FROM webhook_events WHERE provider = 'qpay' AND event_id = ? LIMIT 1",
    )
    .bind(providerEventId)
    .first<{ id: string; status: string }>();
  if (!event) return jsonError("Webhook event хадгалж чадсангүй.", 500);
  if (event.status === "processed") {
    return Response.json({ ok: true, duplicate: true });
  }

  await db.batch([
    db
      .prepare("UPDATE webhook_events SET status = 'processing' WHERE id = ?")
      .bind(event.id),
    db
      .prepare(`
        UPDATE payments SET status = 'processing', updated_at = ?
        WHERE id = ? AND status NOT IN ('succeeded', 'canceled')
      `)
      .bind(now, paymentId),
  ]);

  try {
    const confirmation = await confirmProviderPayment(payment);
    if (!confirmation.confirmed) {
      throw new Error(
        `QPay төлбөрийн дүн баталгаажаагүй: ${confirmation.paidAmount}`,
      );
    }
    await markPaymentSucceeded(paymentId);
    await db
      .prepare(
        "UPDATE webhook_events SET status = 'processed', processed_at = ? WHERE id = ?",
      )
      .bind(new Date().toISOString(), event.id)
      .run();
    return Response.json({ ok: true });
  } catch (caught) {
    await db
      .prepare("UPDATE webhook_events SET status = 'failed' WHERE id = ?")
      .bind(event.id)
      .run();
    const message =
      caught instanceof Error ? caught.message : "QPay баталгаажуулалт амжилтгүй.";
    return jsonError(message, 503);
  }
}

export async function GET(request: Request) {
  return handleWebhook(request);
}

export async function POST(request: Request) {
  return handleWebhook(request);
}
