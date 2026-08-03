import { ensureSchema, getDb } from "../../../db";
import {
  deriveOwnerToken,
  ensureAccessCode,
  getAccessCode,
  getPayment,
  jsonError,
  markPaymentSucceeded,
  parseDeeplinks,
  PaymentAccessError,
  requirePaymentAccess,
} from "../../lib/server/payments";
import {
  enforceRateLimit,
  RateLimitError,
} from "../../lib/server/security";
import { confirmWirePayment } from "../../lib/server/wire";

type PublicationRow = {
  id: string;
  public_slug: string;
  recipient_name: string;
  recipient_gender: string;
};

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const paymentId = url.searchParams.get("id")?.trim() ?? "";
    if (!paymentId) return jsonError("Захиалгын ID дутуу байна.", 400);
    await enforceRateLimit(request, `payment-status:${paymentId}`, 80, 5 * 60_000);

    const access = await requirePaymentAccess(request, paymentId);
    let payment = access.payment;
    const db = await getDb();

    const isNonFinal = (status: string) =>
      status !== "succeeded" &&
      status !== "canceled" &&
      status !== "failed" &&
      status !== "expired";

    if (
      payment.provider === "wire" &&
      isNonFinal(payment.status) &&
      payment.provider_invoice_id
    ) {
      try {
        const confirmation = await confirmWirePayment(payment);
        if (confirmation.confirmed) {
          await markPaymentSucceeded(payment.id);
          const refreshed = await getPayment(payment.id);
          if (refreshed) payment = refreshed;
        } else if (confirmation.status === "canceled") {
          const now = new Date().toISOString();
          await db
            .prepare(`
              UPDATE payments SET status = 'canceled', updated_at = ?
              WHERE id = ? AND status NOT IN ('succeeded', 'canceled')
            `)
            .bind(now, payment.id)
            .run();
          payment = { ...payment, status: "canceled", updated_at: now };
        } else if (confirmation.status === "failed") {
          const now = new Date().toISOString();
          await db
            .prepare(`
              UPDATE payments SET status = 'failed', updated_at = ?
              WHERE id = ? AND status NOT IN ('succeeded', 'canceled')
            `)
            .bind(now, payment.id)
            .run();
          payment = { ...payment, status: "failed", updated_at: now };
        }
      } catch {
        // Wire live pull failed — fall through to DB view; webhook or next poll can recover.
      }
    }

    if (
      payment.status !== "succeeded" &&
      payment.status !== "canceled" &&
      Date.parse(payment.expires_at) <= Date.now()
    ) {
      const now = new Date().toISOString();
      await db
        .prepare(`
          UPDATE payments
          SET status = 'expired', updated_at = ?
          WHERE id = ? AND status NOT IN ('succeeded', 'canceled')
        `)
        .bind(now, payment.id)
        .run();
      payment = { ...payment, status: "expired", updated_at: now };
    }

    let code = await getAccessCode(payment.id);
    if (payment.status === "succeeded" && !code) {
      code = await ensureAccessCode(payment);
    }
    const publication = await db
      .prepare(`
        SELECT g.id, g.public_slug, g.recipient_name, g.recipient_gender
        FROM greeting_private gp
        JOIN greetings g ON g.id = gp.greeting_id
        WHERE gp.payment_id = ?
        LIMIT 1
      `)
      .bind(payment.id)
      .first<PublicationRow>();

    return Response.json({
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        qrText: payment.qr_text,
        qrImage: payment.qr_image,
        shortUrl: payment.short_url,
        deeplinks: parseDeeplinks(payment.deeplinks_json),
        failureReason: payment.failure_reason,
        expiresAt: payment.expires_at,
        accessCode: code?.code ?? "",
        codeStatus: code?.status ?? "",
        publication: publication
          ? {
              id: publication.id,
              publicSlug: publication.public_slug,
              recipientName: publication.recipient_name,
              recipientGender:
                publication.recipient_gender === "male" ? "male" : "female",
              ownerToken: await deriveOwnerToken(payment.id),
            }
          : null,
      },
    });
  } catch (caught) {
    if (caught instanceof PaymentAccessError) {
      return jsonError(caught.message, caught.status);
    }
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Төлбөрийн төлөв уншиж чадсангүй.";
    return jsonError(message, 500);
  }
}
