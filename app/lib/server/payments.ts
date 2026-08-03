import { ensureSchema, getAppBindings, getDb } from "../../../db";
import {
  constantTimeEqual,
  createAccessCode,
  hashValue,
  randomToken,
  signValue,
} from "./security";

export const GREETING_PRICE = 5_500;
export const PAYMENT_CURRENCY = "MNT";

export type PaymentStatus =
  | "requires_action"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "expired";

export type PaymentRow = {
  id: string;
  order_id: string;
  draft_id: string;
  provider: string;
  provider_invoice_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  client_secret_hash: string;
  qr_text: string;
  qr_image: string;
  short_url: string;
  deeplinks_json: string;
  failure_reason: string;
  expires_at: string;
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AccessCodeRow = {
  id: string;
  payment_id: string;
  code: string;
  status: "issued" | "valid" | "used" | "expired" | "revoked" | "refunded";
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  greeting_id: string | null;
};

export type PaymentAccess = {
  payment: PaymentRow;
  credential: string;
  kind: "client" | "recovery";
};

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function requireAppSecret() {
  const bindings = await getAppBindings();
  const secret = bindings.APP_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new PaymentConfigurationError(
      "Төлбөрийн server тохиргоо дутуу байна.",
    );
  }
  return secret;
}

export class PaymentConfigurationError extends Error {
  status = 503;
}

export function createOrderId() {
  const time = Date.now().toString(36).toUpperCase();
  const random = randomToken(6)
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 8);
  return `BDY${time}${random}`;
}

export function paymentExpiry(now = Date.now(), minutes = 15) {
  return new Date(now + minutes * 60_000).toISOString();
}

export function accessCodeExpiry(now = Date.now(), days = 30) {
  return new Date(now + days * 86_400_000).toISOString();
}

export async function deriveOwnerToken(paymentId: string) {
  const secret = await requireAppSecret();
  return signValue(secret, `owner:${paymentId}`);
}

export async function deriveRecoveryToken(paymentId: string, email: string) {
  const secret = await requireAppSecret();
  return signValue(secret, `recovery:${paymentId}:${email}`);
}

export async function signWebhook(paymentId: string, timestamp: string) {
  const secret = await requireAppSecret();
  return signValue(secret, `qpay:${paymentId}:${timestamp}`);
}

export async function getPayment(paymentId: string) {
  await ensureSchema();
  const db = await getDb();
  return db
    .prepare("SELECT * FROM payments WHERE id = ? LIMIT 1")
    .bind(paymentId)
    .first<PaymentRow>();
}

export async function requirePaymentAccess(
  request: Request,
  paymentId: string,
): Promise<PaymentAccess> {
  const payment = await getPayment(paymentId);
  if (!payment) throw new PaymentAccessError("Захиалга олдсонгүй.", 404);

  const clientSecret = request.headers.get("x-payment-secret")?.trim() ?? "";
  if (clientSecret) {
    const hash = await hashValue(clientSecret);
    if (constantTimeEqual(hash, payment.client_secret_hash)) {
      return { payment, credential: clientSecret, kind: "client" };
    }
  }

  const recoveryToken = request.headers.get("x-recovery-token")?.trim() ?? "";
  if (recoveryToken) {
    const db = await getDb();
    const draft = await db
      .prepare("SELECT owner_email FROM drafts WHERE id = ? LIMIT 1")
      .bind(payment.draft_id)
      .first<{ owner_email: string }>();
    if (draft) {
      const expected = await deriveRecoveryToken(payment.id, draft.owner_email);
      if (constantTimeEqual(expected, recoveryToken)) {
        return { payment, credential: recoveryToken, kind: "recovery" };
      }
    }
  }

  throw new PaymentAccessError("Төлбөрийн эрх баталгаажсангүй.", 401);
}

export class PaymentAccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function getAccessCode(paymentId: string) {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM access_codes WHERE payment_id = ? LIMIT 1")
    .bind(paymentId)
    .first<AccessCodeRow>();
}

export async function ensureAccessCode(payment: PaymentRow) {
  const existing = await getAccessCode(payment.id);
  if (existing) return existing;

  const bindings = await getAppBindings();
  const days = Math.max(
    1,
    Math.min(365, Number(bindings.ACCESS_CODE_TTL_DAYS ?? "30") || 30),
  );
  const now = new Date().toISOString();
  const db = await getDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = crypto.randomUUID();
    const code = createAccessCode();
    try {
      await db.batch([
        db
          .prepare(`
            INSERT INTO access_codes (
              id, payment_id, code, status, issued_at, expires_at, used_at, greeting_id
            ) VALUES (?, ?, ?, 'issued', ?, ?, NULL, NULL)
          `)
          .bind(id, payment.id, code, now, accessCodeExpiry(Date.now(), days)),
        db
          .prepare(`
            INSERT INTO notifications (
              id, type, email, payload_json, status, created_at, sent_at
            )
            SELECT ?, 'payment_succeeded', owner_email, ?, 'queued', ?, NULL
            FROM drafts WHERE id = ?
          `)
          .bind(
            crypto.randomUUID(),
            JSON.stringify({ paymentId: payment.id, orderId: payment.order_id, code }),
            now,
            payment.draft_id,
          ),
      ]);
      const issued = await getAccessCode(payment.id);
      if (issued) return issued;
    } catch {
      const raced = await getAccessCode(payment.id);
      if (raced) return raced;
    }
  }
  throw new Error("Нэг удаагийн эрхийн код үүсгэж чадсангүй.");
}

export async function markPaymentSucceeded(paymentId: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .prepare(`
      UPDATE payments
      SET status = 'succeeded', succeeded_at = COALESCE(succeeded_at, ?),
          failure_reason = '', updated_at = ?
      WHERE id = ? AND status NOT IN ('canceled')
    `)
    .bind(now, now, paymentId)
    .run();
  const payment = await getPayment(paymentId);
  if (!payment || payment.status !== "succeeded") {
    throw new Error("Төлбөрийн төлөвийг баталгаажуулж чадсангүй.");
  }
  return ensureAccessCode(payment);
}

export function parseDeeplinks(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is { name: string; description: string; logo: string; link: string } =>
          typeof item?.name === "string" && typeof item?.link === "string",
      )
      .slice(0, 20)
      .map((item) => ({
        name: item.name.slice(0, 60),
        description: String(item.description ?? "").slice(0, 100),
        logo: String(item.logo ?? "").slice(0, 500),
        link: item.link.slice(0, 1000),
      }));
  } catch {
    return [];
  }
}
