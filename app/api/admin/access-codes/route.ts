import { ensureSchema } from "../../../../db";
import {
  issueManualAccessCode,
  listAccessCodes,
} from "../../../lib/server/access-codes";
import { AdminAuthError, requireAdmin } from "../../../lib/server/admin";
import { jsonError } from "../../../lib/server/payments";
import { enforceRateLimit, RateLimitError } from "../../../lib/server/security";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "admin-access-code:create", 30, 15 * 60_000);
    await requireAdmin(request);

    const payload = (await request.json()) as {
      count?: number;
      label?: string;
      createdBy?: string;
      ttlDays?: number;
    };
    const count = Math.max(1, Math.min(50, Number(payload.count ?? 1) || 1));
    const label = String(payload.label ?? "").slice(0, 120);
    const createdBy = String(payload.createdBy ?? "admin").slice(0, 120);
    const ttlDays = payload.ttlDays ? Number(payload.ttlDays) : undefined;

    const created = [] as Array<{
      id: string;
      code: string;
      issuedAt: string;
      expiresAt: string | null;
      label: string | null;
    }>;
    for (let i = 0; i < count; i += 1) {
      const row = await issueManualAccessCode({ label, createdBy, ttlDays });
      created.push({
        id: row.id,
        code: row.code,
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
        label: row.label,
      });
    }
    return Response.json({ created });
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return jsonError(caught.message, caught.status);
    }
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Код үүсгэж чадсангүй.";
    return jsonError(message, 500);
  }
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "admin-access-code:list", 60, 15 * 60_000);
    await requireAdmin(request);
    const url = new URL(request.url);
    const sourceParam = url.searchParams.get("source") ?? "all";
    const source =
      sourceParam === "paid" || sourceParam === "manual" ? sourceParam : "all";
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const rows = await listAccessCodes({ limit, source });
    return Response.json({
      codes: rows.map((row) => ({
        id: row.id,
        code: row.code,
        source: row.source,
        status: row.status,
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
        usedAt: row.used_at,
        greetingId: row.greeting_id,
        label: row.label,
        createdBy: row.created_by,
      })),
    });
  } catch (caught) {
    if (caught instanceof AdminAuthError) {
      return jsonError(caught.message, caught.status);
    }
    if (caught instanceof RateLimitError) {
      return jsonError(caught.message, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "Кодын жагсаалт уншиж чадсангүй.";
    return jsonError(message, 500);
  }
}
