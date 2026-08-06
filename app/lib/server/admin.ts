import { getAppBindings } from "../../../db";
import { requireAppSecret } from "./payments";
import { constantTimeEqual, signValue } from "./security";

const DEFAULT_ADMIN_EMAILS = ["gbuyandelger277@gmail.com"];

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export async function getAdminEmails() {
  const bindings = await getAppBindings();
  const raw = bindings.ADMIN_EMAILS?.trim() ?? "";
  if (!raw) return DEFAULT_ADMIN_EMAILS.map(normalizeEmail);
  return raw
    .split(/[,\s]+/)
    .map(normalizeEmail)
    .filter(Boolean);
}

export async function isAdminEmail(email: string) {
  const list = await getAdminEmails();
  return list.includes(normalizeEmail(email));
}

export async function deriveAdminToken(email: string) {
  const secret = await requireAppSecret();
  return signValue(secret, `admin:${normalizeEmail(email)}`);
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

export class AdminAuthError extends Error {
  status = 401;
  constructor(message = "Админ эрх баталгаажсангүй.") {
    super(message);
  }
}

export async function requireAdmin(request: Request) {
  const supplied = readBearerToken(request);
  if (!supplied) throw new AdminAuthError();

  const bindings = await getAppBindings();
  const legacySecret = bindings.ADMIN_API_SECRET?.trim() ?? "";
  if (legacySecret.length >= 24 && constantTimeEqual(legacySecret, supplied)) {
    return { email: "legacy@admin" as const };
  }

  const emails = await getAdminEmails();
  for (const email of emails) {
    const expected = await deriveAdminToken(email);
    if (constantTimeEqual(expected, supplied)) {
      return { email };
    }
  }
  throw new AdminAuthError();
}
