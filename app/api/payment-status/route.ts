import { getDb } from "../../../db";
import {
  deriveOwnerToken,
  ensureAccessCode,
  getAccessCode,
  jsonError,
  parseDeeplinks,
  PaymentAccessError,
  requirePaymentAccess,
} from "../../lib/server/payments";
import {
  enforceRateLimit,
  RateLimitError,
} from "../../lib/server/security";

type PublicationRow = {
  id: string;
  public_slug: string;
  recipient_name: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const paymentId = url.searchParams.get("id")?.trim() ?? "";
    if (!paymentId) return jsonError("Захиалгын ID дутуу байна.", 400);
    await enforceRateLimit(request, `payment-status:${paymentId}`, 80, 5 * 60_000);

    const access = await requirePaymentAccess(request, paymentId);
    let payment = access.payment;
    const db = await getDb();
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
        SELECT g.id, g.public_slug, g.recipient_name
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

