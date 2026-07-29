import { ensureSchema, getDb } from "../../../db";
import {
  type DashboardGreeting,
  type PublicGreeting,
  type ReactionType,
  type TemplateId,
  sanitizePlainText,
  templates,
} from "../../lib/greeting";

type GreetingRow = {
  id: string;
  owner_token_hash: string;
  public_slug: string;
  recipient_name: string;
  sender_name: string;
  template: string;
  headline: string;
  message: string;
  surprise_message: string;
  music_url: string;
  music_name: string;
  photos_json: string;
  birthday_date: string;
  opened_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

type ResponseRow = {
  id: string;
  type: string;
  name: string;
  message: string;
  created_at: string;
};

const reactionTypes = new Set<ReactionType>(["heart", "party", "surprised"]);
const templateIds = new Set(templates.map((template) => template.id));

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parsePhotos(value: string) {
  try {
    const photos = JSON.parse(value);
    return Array.isArray(photos)
      ? photos.filter((item): item is string => typeof item === "string").slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

function toPublicGreeting(row: GreetingRow): PublicGreeting {
  return {
    publicSlug: row.public_slug,
    recipientName: row.recipient_name,
    senderName: row.sender_name,
    template: (templateIds.has(row.template as TemplateId)
      ? row.template
      : "cute") as TemplateId,
    headline: row.headline,
    message: row.message,
    surpriseMessage: row.surprise_message,
    musicUrl: row.music_url,
    musicName: row.music_name,
    photos: parsePhotos(row.photos_json),
    birthdayDate: row.birthday_date,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const db = await getDb();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug")?.trim();

    if (slug) {
      const row = await db
        .prepare("SELECT * FROM greetings WHERE public_slug = ? LIMIT 1")
        .bind(slug)
        .first<GreetingRow>();
      if (!row) return error("Мэндчилгээ олдсонгүй.", 404);
      return Response.json({ greeting: toPublicGreeting(row) });
    }

    if (url.searchParams.get("dashboard") === "1") {
      const ownerToken = readBearerToken(request);
      if (ownerToken.length < 32) return error("Dashboard эрх олдсонгүй.", 401);
      const ownerTokenHash = await hashToken(ownerToken);
      const row = await db
        .prepare(`
          SELECT g.*
          FROM greetings g
          LEFT JOIN greeting_private gp ON gp.greeting_id = g.id
          WHERE gp.owner_token_hash = ?
             OR (gp.greeting_id IS NULL AND g.owner_token_hash = ?)
          LIMIT 1
        `)
        .bind(ownerTokenHash, ownerTokenHash)
        .first<GreetingRow>();
      if (!row) return error("Мэндчилгээ олдсонгүй.", 404);

      const responseRows = await db
        .prepare(
          "SELECT id, type, name, message, created_at FROM responses WHERE greeting_id = ? ORDER BY created_at DESC",
        )
        .bind(row.id)
        .all<ResponseRow>();

      const reactions: Record<ReactionType, number> = {
        heart: 0,
        party: 0,
        surprised: 0,
      };
      const guestbook: DashboardGreeting["guestbook"] = [];
      for (const item of responseRows.results) {
        if (reactionTypes.has(item.type as ReactionType)) {
          reactions[item.type as ReactionType] += 1;
        } else if (item.type === "guestbook") {
          guestbook.push({
            id: item.id,
            name: item.name,
            message: item.message,
            createdAt: item.created_at,
          });
        }
      }

      const greeting: DashboardGreeting = {
        ...toPublicGreeting(row),
        id: row.id,
        openedAt: row.opened_at,
        viewCount: row.view_count,
        reactions,
        guestbook,
      };
      return Response.json({ greeting });
    }

    return error("Хүсэлт тодорхойгүй байна.", 400);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Өгөгдөл уншихад алдаа гарлаа.";
    return error(message, 500);
  }
}

export async function POST(request: Request) {
  void request;
  return error(
    "Мэндчилгээг нийтлэхийн өмнө төлбөрөө backend-ээр баталгаажуулна уу.",
    402,
  );
}

export async function PATCH(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      slug?: string;
      action?: "open" | "react" | "guestbook";
      sessionId?: string;
      reactionType?: ReactionType;
      name?: string;
      message?: string;
    };
    const slug = sanitizePlainText(payload.slug ?? "", 80).trim();
    const sessionId = sanitizePlainText(payload.sessionId ?? "", 100).trim();
    if (!slug || !payload.action || !sessionId) {
      return error("Үйлдлийн мэдээлэл дутуу байна.", 400);
    }

    const db = await getDb();
    const row = await db
      .prepare("SELECT id FROM greetings WHERE public_slug = ? LIMIT 1")
      .bind(slug)
      .first<{ id: string }>();
    if (!row) return error("Мэндчилгээ олдсонгүй.", 404);

    const now = new Date().toISOString();
    if (payload.action === "open") {
      await db
        .prepare(
          "UPDATE greetings SET opened_at = COALESCE(opened_at, ?), view_count = view_count + 1, updated_at = ? WHERE id = ?",
        )
        .bind(now, now, row.id)
        .run();
      return Response.json({ ok: true });
    }

    if (payload.action === "react") {
      if (!payload.reactionType || !reactionTypes.has(payload.reactionType)) {
        return error("Reaction буруу байна.", 400);
      }
      await db
        .prepare(
          "INSERT INTO responses (id, greeting_id, session_id, type, name, message, created_at) VALUES (?, ?, ?, ?, '', '', ?)",
        )
        .bind(
          crypto.randomUUID(),
          row.id,
          sessionId,
          payload.reactionType,
          now,
        )
        .run();
      return Response.json({ ok: true });
    }

    const name =
      sanitizePlainText(payload.name ?? "", 40).trim() || "Нууц зочин";
    const message = sanitizePlainText(payload.message ?? "", 400).trim();
    if (!message) return error("Мэндчилгээ хоосон байна.", 400);
    await db
      .prepare(
        "INSERT INTO responses (id, greeting_id, session_id, type, name, message, created_at) VALUES (?, ?, ?, 'guestbook', ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), row.id, sessionId, name, message, now)
      .run();
    return Response.json({ ok: true });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Хариу хадгалахад алдаа гарлаа.";
    return error(message, 500);
  }
}
