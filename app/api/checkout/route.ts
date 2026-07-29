import { ensureSchema, getAppBindings, getDb } from "../../../db";
import { type GreetingDraft } from "../../lib/greeting";
import {
  cleanDraft,
  cleanEmail,
  isValidEmail,
  validateDraft,
} from "../../lib/server/draft";
import {
  createOrderId,
  GREETING_PRICE,
  jsonError,
  PAYMENT_CURRENCY,
  paymentExpiry,
  PaymentConfigurationError,
  requireAppSecret,
} from "../../lib/server/payments";
import { createProviderInvoice, assertProviderConfiguration } from "../../lib/server/qpay";
import {
  enforceRateLimit,
  hashValue,
  randomToken,
  RateLimitError,
} from "../../lib/server/security";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "checkout", 5, 15 * 60_000);
    await requireAppSecret();
    await assertProviderConfiguration();

    const payload = (await request.json()) as {
      draft?: GreetingDraft;
      email?: string;
    };
    if (!payload.draft) return jsonError("Ноорог олдсонгүй.", 400);
    const draft = cleanDraft(payload.draft);
    const validationError = validateDraft(draft);
    if (validationError) return jsonError(validationError, 400);

    const email = cleanEmail(payload.email ?? "");
    if (!isValidEmail(email)) {
      return jsonError("Сэргээх боломжтой зөв email оруулна уу.", 400);
    }

    const bindings = await getAppBindings();
    const ttlMinutes = Math.max(
      5,
      Math.min(120, Number(bindings.PAYMENT_TTL_MINUTES ?? "15") || 15),
    );
    const now = new Date().toISOString();
    const expiresAt = paymentExpiry(Date.now(), ttlMinutes);
    const draftId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    const orderId = createOrderId();
    const clientSecret = randomToken(32);
    const clientSecretHash = await hashValue(clientSecret);
    const mode =
      bindings.PAYMENT_PROVIDER_MODE?.toLowerCase() === "demo" ? "demo" : "qpay";
    const configuredOrigin = bindings.PUBLIC_APP_URL?.trim();
    const callbackOrigin = configuredOrigin || new URL(request.url).origin;

    const db = await getDb();
    await db.batch([
      db
        .prepare(`
          INSERT INTO drafts (
            id, content_json, owner_email, status, created_at, expires_at
          ) VALUES (?, ?, ?, 'checkout', ?, ?)
        `)
        .bind(draftId, JSON.stringify(draft), email, now, expiresAt),
      db
        .prepare(`
          INSERT INTO payments (
            id, order_id, draft_id, provider, provider_invoice_id, amount,
            currency, status, client_secret_hash, qr_text, qr_image,
            short_url, deeplinks_json, failure_reason, expires_at,
            succeeded_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, 'processing', ?, '', '', '', '[]', '', ?, NULL, ?, ?)
        `)
        .bind(
          paymentId,
          orderId,
          draftId,
          mode,
          GREETING_PRICE,
          PAYMENT_CURRENCY,
          clientSecretHash,
          expiresAt,
          now,
          now,
        ),
    ]);

    try {
      const invoice = await createProviderInvoice({
        paymentId,
        orderId,
        recipientCode: draftId.replaceAll("-", "").slice(0, 24),
        email,
        callbackOrigin,
      });
      await db
        .prepare(`
          UPDATE payments
          SET provider = ?, provider_invoice_id = ?, status = 'requires_action',
              qr_text = ?, qr_image = ?, short_url = ?, deeplinks_json = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .bind(
          invoice.provider,
          invoice.invoiceId,
          invoice.qrText,
          invoice.qrImage,
          invoice.shortUrl,
          JSON.stringify(invoice.deeplinks),
          new Date().toISOString(),
          paymentId,
        )
        .run();

      return Response.json(
        {
          paymentId,
          orderId,
          clientSecret,
          amount: GREETING_PRICE,
          currency: PAYMENT_CURRENCY,
          status: "requires_action",
          expiresAt,
        },
        { status: 201 },
      );
    } catch (caught) {
      const reason =
        caught instanceof Error ? caught.message : "Нэхэмжлэх үүсгэхэд алдаа гарлаа.";
      await db
        .prepare(`
          UPDATE payments
          SET status = 'failed', failure_reason = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(reason.slice(0, 500), new Date().toISOString(), paymentId)
        .run();
      return jsonError(reason, 502);
    }
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    if (caught instanceof PaymentConfigurationError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Checkout эхлүүлж чадсангүй.";
    return jsonError(message, 500);
  }
}

