import { ensureSchema, getAppBindings, getDb } from "../../../db";
import {
  accessCodeExpiry,
  createOrderId,
  paymentExpiry,
  type AccessCodeRow,
} from "./payments";
import { createAccessCode, hashValue, randomToken } from "./security";

export type ManualCodeInput = {
  label?: string;
  createdBy?: string;
  ttlDays?: number;
};

export type NormalizedCode = {
  code: string;
  normalized: string;
};

export function normalizeAccessCode(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .trim();
}

export async function findAccessCodeByCode(code: string) {
  await ensureSchema();
  const normalized = normalizeAccessCode(code);
  if (!normalized) return null;
  const db = await getDb();
  return db
    .prepare("SELECT * FROM access_codes WHERE code = ? LIMIT 1")
    .bind(normalized)
    .first<AccessCodeRow>();
}

export async function issueManualAccessCode(input: ManualCodeInput = {}) {
  await ensureSchema();
  const bindings = await getAppBindings();
  const days = Math.max(
    1,
    Math.min(
      365,
      Number(
        input.ttlDays ?? bindings.ACCESS_CODE_TTL_DAYS ?? "30",
      ) || 30,
    ),
  );
  const now = new Date().toISOString();
  const db = await getDb();
  const label = input.label?.trim().slice(0, 120) || null;
  const createdBy = input.createdBy?.trim().slice(0, 120) || null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const paymentId = crypto.randomUUID();
    const orderId = createOrderId();
    const accessId = crypto.randomUUID();
    const code = createAccessCode();
    const draftId = crypto.randomUUID();
    const clientSecret = randomToken(24);
    const clientSecretHash = await hashValue(clientSecret);
    try {
      await db.batch([
        db
          .prepare(`
            INSERT INTO drafts (
              id, content_json, owner_email, status, created_at, expires_at
            ) VALUES (?, ?, ?, 'manual', ?, ?)
          `)
          .bind(
            draftId,
            "{}",
            createdBy || "admin@manual",
            now,
            accessCodeExpiry(Date.now(), days),
          ),
        db
          .prepare(`
            INSERT INTO payments (
              id, order_id, draft_id, provider, provider_invoice_id, amount,
              currency, status, client_secret_hash, qr_text, qr_image,
              short_url, deeplinks_json, failure_reason, expires_at,
              succeeded_at, created_at, updated_at
            ) VALUES (?, ?, ?, 'manual', NULL, 0, 'MNT', 'succeeded', ?, '', '', '', '[]', '', ?, ?, ?, ?)
          `)
          .bind(
            paymentId,
            orderId,
            draftId,
            clientSecretHash,
            paymentExpiry(Date.now(), 60),
            now,
            now,
            now,
          ),
        db
          .prepare(`
            INSERT INTO access_codes (
              id, payment_id, source, code, status, issued_at, expires_at,
              used_at, greeting_id, label, created_by
            ) VALUES (?, ?, 'manual', ?, 'issued', ?, ?, NULL, NULL, ?, ?)
          `)
          .bind(
            accessId,
            paymentId,
            code,
            now,
            accessCodeExpiry(Date.now(), days),
            label,
            createdBy,
          ),
      ]);
      const issued = await db
        .prepare("SELECT * FROM access_codes WHERE id = ? LIMIT 1")
        .bind(accessId)
        .first<AccessCodeRow>();
      if (issued) return issued;
    } catch {
      // retry on unique-index collision
    }
  }
  throw new Error("Гараар код үүсгэж чадсангүй.");
}

export async function listAccessCodes(
  options: { limit?: number; source?: "paid" | "manual" | "all" } = {},
) {
  await ensureSchema();
  const db = await getDb();
  const limit = Math.max(1, Math.min(500, options.limit ?? 100));
  const source = options.source ?? "all";
  const query =
    source === "all"
      ? "SELECT * FROM access_codes ORDER BY issued_at DESC LIMIT ?"
      : "SELECT * FROM access_codes WHERE source = ? ORDER BY issued_at DESC LIMIT ?";
  const stmt = db.prepare(query);
  const bound = source === "all" ? stmt.bind(limit) : stmt.bind(source, limit);
  const rows = await bound.all<AccessCodeRow>();
  return rows.results;
}
