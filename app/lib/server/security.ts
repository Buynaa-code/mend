import { getDb } from "../../../db";

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array) {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function hashValue(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

export async function signValue(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |=
      (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function randomToken(byteLength = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64Url(bytes);
}

export function createAccessCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = [...bytes]
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
  return `BDY-${suffix}`;
}

export function readClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function enforceRateLimit(
  request: Request,
  action: string,
  limit: number,
  windowMs: number,
) {
  const db = await getDb();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const identity = await hashValue(
    `${action}:${readClientIp(request)}:${windowStart}`,
  );
  const key = `${action}:${identity}`;
  await db
    .prepare(`
      INSERT INTO rate_limits (key, window_start, count, expires_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = count + 1
    `)
    .bind(key, windowStart, windowStart + windowMs * 2)
    .run();
  const row = await db
    .prepare("SELECT count FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > limit) {
    throw new RateLimitError();
  }

  if (crypto.getRandomValues(new Uint8Array(1))[0] < 8) {
    await db
      .prepare("DELETE FROM rate_limits WHERE expires_at < ?")
      .bind(now)
      .run();
  }
}

export class RateLimitError extends Error {
  status = 429;

  constructor() {
    super("Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.");
  }
}
