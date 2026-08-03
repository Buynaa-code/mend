import { getDb } from "../../../../db";
import {
  getPayment,
  jsonError,
  markPaymentSucceeded,
} from "../../../lib/server/payments";
import { hashValue } from "../../../lib/server/security";
import { confirmWirePayment, verifyWireSignature } from "../../../lib/server/wire";

type WireEventEnvelope = {
  id?: string;
  object?: string;
  type?: string;
  api_version?: string;
  livemode?: boolean;
  created?: number;
  data?: {
    object?: {
      id?: string;
      object?: string;
      amount?: number;
      status?: string;
      metadata?: Record<string, unknown>;
    };
  };
};

export function GET() {
  return Response.json({ ok: true, service: "wire-webhook" });
}

export function HEAD() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("wirepayment-signature");
  const verified = await verifyWireSignature(rawBody, signature);
  if (!verified) {
    return jsonError("wire.mn webhook signature буруу байна.", 401);
  }

  let event: WireEventEnvelope;
  try {
    event = JSON.parse(rawBody || "{}") as WireEventEnvelope;
  } catch {
    return jsonError("wire.mn webhook payload буруу.", 400);
  }

  const eventId = event.id?.toString().trim();
  const eventType = (event.type || "").toLowerCase();
  const intent = event.data?.object;
  if (!eventId || !eventType) {
    return Response.json({ ok: true, verification: true });
  }

  const paymentEventTypes = new Set([
    "payment_intent.succeeded",
    "payment_intent.canceled",
    "payment_intent.failed",
  ]);
  if (!paymentEventTypes.has(eventType)) {
    return Response.json({ ok: true, ignored: true });
  }
  if (!intent?.id) {
    return jsonError("wire.mn PaymentIntent дутуу байна.", 400);
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const payloadHash = await hashValue(rawBody);
  await db
    .prepare(`
      INSERT OR IGNORE INTO webhook_events (
        id, provider, event_id, payload_hash, status, created_at,
        signature_verified_at, processed_at
      ) VALUES (?, 'wire', ?, ?, 'received', ?, ?, NULL)
    `)
    .bind(crypto.randomUUID(), eventId, payloadHash, now, now)
    .run();

  const storedEvent = await db
    .prepare(
      "SELECT id, status FROM webhook_events WHERE provider = 'wire' AND event_id = ? LIMIT 1",
    )
    .bind(eventId)
    .first<{ id: string; status: string }>();
  if (!storedEvent) {
    return jsonError("wire.mn webhook event хадгалж чадсангүй.", 500);
  }
  if (storedEvent.status === "processed") {
    return Response.json({ ok: true, duplicate: true });
  }

  const metadataPaymentId = intent.metadata?.payment_id;
  const paymentId =
    typeof metadataPaymentId === "string" ? metadataPaymentId.trim() : "";
  if (!paymentId) {
    await db
      .prepare("UPDATE webhook_events SET status = 'failed' WHERE id = ?")
      .bind(storedEvent.id)
      .run();
    return jsonError("wire.mn intent metadata.payment_id дутуу байна.", 400);
  }

  const payment = await getPayment(paymentId);
  if (!payment || payment.provider !== "wire") {
    await db
      .prepare("UPDATE webhook_events SET status = 'failed' WHERE id = ?")
      .bind(storedEvent.id)
      .run();
    return jsonError("wire.mn захиалга олдсонгүй.", 404);
  }

  await db
    .prepare("UPDATE webhook_events SET status = 'processing' WHERE id = ?")
    .bind(storedEvent.id)
    .run();

  try {
    if (eventType === "payment_intent.succeeded") {
      const confirmation = await confirmWirePayment(payment);
      if (!confirmation.confirmed) {
        throw new Error(
          `wire.mn intent баталгаажаагүй (status=${confirmation.status}, amount=${confirmation.paidAmount}).`,
        );
      }
      if (payment.status !== "succeeded") {
        await markPaymentSucceeded(paymentId);
      }
    } else if (
      eventType === "payment_intent.canceled" ||
      eventType === "payment_intent.failed"
    ) {
      const nextStatus =
        eventType === "payment_intent.canceled" ? "canceled" : "failed";
      await db
        .prepare(`
          UPDATE payments SET status = ?, updated_at = ?
          WHERE id = ? AND status NOT IN ('succeeded', 'canceled')
        `)
        .bind(nextStatus, new Date().toISOString(), paymentId)
        .run();
    }
    await db
      .prepare(
        "UPDATE webhook_events SET status = 'processed', processed_at = ? WHERE id = ?",
      )
      .bind(new Date().toISOString(), storedEvent.id)
      .run();
    return Response.json({ ok: true });
  } catch (caught) {
    await db
      .prepare("UPDATE webhook_events SET status = 'failed' WHERE id = ?")
      .bind(storedEvent.id)
      .run();
    const message =
      caught instanceof Error
        ? caught.message
        : "wire.mn event боловсруулж чадсангүй.";
    return jsonError(message, 503);
  }
}
