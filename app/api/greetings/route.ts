import { headers } from "next/headers";
import { getSupabaseAdmin } from "../../../db";
import type { GreetingRow } from "../../../db/schema";
import type {
  EngagementStatus,
  GreetingDraft,
  GreetingStatus,
  ModerationStatus,
  PaymentStatus,
} from "../../lib/greeting";
import { isDraftReady, sanitizePlainText } from "../../lib/greeting";

function readDraft(value: GreetingRow["draft_json"]) {
  return value as unknown as GreetingDraft;
}

function toResponse(row: GreetingRow) {
  return { ...row, draft: readDraft(row.draft_json) };
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("Supabase server configuration")) {
    return "Server sync тохируулагдаагүй байна. Draft төхөөрөмж дээр хадгалагдсан хэвээр.";
  }
  return message;
}

async function getCreatorEmail() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-email");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const slug = url.searchParams.get("slug");
    const db = getSupabaseAdmin();

    if (id || slug) {
      const column = id ? "id" : "slug";
      const value = id ?? slug ?? "";
      const { data, error } = await db
        .from("greetings")
        .select("*")
        .eq(column, value)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return Response.json({ error: "Мэндчилгээ олдсонгүй." }, { status: 404 });
      }
      return Response.json({ greeting: toResponse(data) });
    }

    const { data, error } = await db
      .from("greetings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return Response.json({ greetings: (data ?? []).map(toResponse) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { draft?: GreetingDraft };
    if (!payload.draft?.id || !payload.draft.guestId) {
      return Response.json({ error: "Draft мэдээлэл дутуу байна." }, { status: 400 });
    }

    const draft: GreetingDraft = {
      ...payload.draft,
      recipientName: sanitizePlainText(payload.draft.recipientName, 40),
      senderName: sanitizePlainText(payload.draft.senderName, 40),
      headline: sanitizePlainText(payload.draft.headline, 80),
      greetingText: sanitizePlainText(payload.draft.greetingText, 1000),
      secretMessage: sanitizePlainText(payload.draft.secretMessage, 500),
      updatedAt: new Date().toISOString(),
    };
    const creatorEmail = await getCreatorEmail();
    const db = getSupabaseAdmin();
    const row: DatabaseGreetingInsert = {
      id: draft.id,
      guest_id: draft.guestId,
      creator_email: creatorEmail,
      recipient_name: draft.recipientName,
      template_id: draft.templateId || null,
      greeting_status: draft.greetingStatus,
      payment_status: draft.paymentStatus,
      engagement_status: draft.engagementStatus,
      moderation_status: draft.moderationStatus,
      slug: draft.slug || null,
      draft_json: draft as unknown as Record<string, unknown>,
      created_at: draft.createdAt,
      updated_at: draft.updatedAt,
    };

    const { error } = await db.from("greetings").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return Response.json({ greeting: draft, savedAt: draft.updatedAt });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

type DatabaseGreetingInsert = {
  id: string;
  guest_id: string;
  creator_email: string | null;
  recipient_name: string;
  template_id: string | null;
  greeting_status: string;
  payment_status: string;
  engagement_status: string;
  moderation_status: string;
  slug: string | null;
  draft_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ActionPayload = {
  id?: string;
  action?:
    | "start-payment"
    | "confirm-demo-payment"
    | "publish"
    | "open"
    | "react"
    | "reply"
    | "moderate";
  emoji?: string;
  message?: string;
  sessionId?: string;
  moderationStatus?: ModerationStatus;
  reason?: string;
};

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as ActionPayload;
    if (!payload.id || !payload.action) {
      return Response.json({ error: "Үйлдэл тодорхойгүй байна." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: row, error: findError } = await db
      .from("greetings")
      .select("*")
      .eq("id", payload.id)
      .maybeSingle();
    if (findError) throw findError;
    if (!row) {
      return Response.json({ error: "Мэндчилгээ олдсонгүй." }, { status: 404 });
    }

    const draft = readDraft(row.draft_json);
    const now = new Date();
    let greetingStatus = row.greeting_status as GreetingStatus;
    let paymentStatus = row.payment_status as PaymentStatus;
    let engagementStatus = row.engagement_status as EngagementStatus;
    let moderationStatus = row.moderation_status as ModerationStatus;
    let slug = row.slug;
    let publishedAt = row.published_at;
    let firstOpenedAt = row.first_opened_at;
    let lastOpenedAt = row.last_opened_at;
    let totalViewCount = row.total_view_count;
    let uniqueViewCount = row.unique_view_count;

    switch (payload.action) {
      case "start-payment":
        if (!isDraftReady(draft)) {
          return Response.json(
            { error: "Төлбөр эхлүүлэхийн өмнө заавал талбаруудаа бөглөнө үү." },
            { status: 409 },
          );
        }
        greetingStatus = "READY_TO_PAY";
        paymentStatus = "PENDING";
        break;
      case "confirm-demo-payment":
        if (paymentStatus !== "PENDING") {
          return Response.json(
            { error: "Хүлээгдэж буй demo төлбөр алга байна." },
            { status: 409 },
          );
        }
        paymentStatus = "SUCCESS";
        greetingStatus = "READY_TO_PUBLISH";
        break;
      case "publish":
        if (paymentStatus !== "SUCCESS") {
          return Response.json({ error: "Төлбөр баталгаажаагүй байна." }, { status: 409 });
        }
        slug =
          slug ||
          `${draft.recipientName.toLowerCase().replace(/\s+/g, "-")}-${draft.id.slice(-5)}`;
        greetingStatus = "PUBLISHED";
        engagementStatus = "NOT_OPENED";
        publishedAt = now.toISOString();
        break;
      case "open":
        if (greetingStatus !== "PUBLISHED" || moderationStatus === "BLOCKED") {
          return Response.json(
            { error: "Энэ мэндчилгээг нээх боломжгүй байна." },
            { status: 403 },
          );
        }
        engagementStatus = "OPENED";
        firstOpenedAt ||= now.toISOString();
        lastOpenedAt = now.toISOString();
        totalViewCount += 1;
        uniqueViewCount += payload.sessionId ? 1 : 0;
        break;
      case "react": {
        const emoji = sanitizePlainText(payload.emoji ?? "", 4);
        if (!emoji || !payload.sessionId) {
          return Response.json({ error: "Reaction мэдээлэл дутуу байна." }, { status: 400 });
        }
        const { error } = await db.from("reactions").upsert(
          {
            id: crypto.randomUUID(),
            greeting_id: row.id,
            session_id: payload.sessionId,
            emoji,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "greeting_id,session_id" },
        );
        if (error) throw error;
        engagementStatus = "REACTED";
        draft.reaction = emoji;
        break;
      }
      case "reply": {
        if (!draft.allowReply || !payload.sessionId) {
          return Response.json(
            { error: "Хариу илгээх эрх хаалттай байна." },
            { status: 403 },
          );
        }
        const message = sanitizePlainText(payload.message ?? "", 500).trim();
        if (!message) {
          return Response.json({ error: "Хариу хоосон байна." }, { status: 400 });
        }
        const { error } = await db.from("replies").insert({
          id: crypto.randomUUID(),
          greeting_id: row.id,
          session_id: payload.sessionId,
          message,
          created_at: now.toISOString(),
        });
        if (error) throw error;
        engagementStatus = "REPLIED";
        draft.reply = message;
        break;
      }
      case "moderate": {
        moderationStatus = payload.moderationStatus ?? "UNDER_REVIEW";
        if (moderationStatus === "BLOCKED") greetingStatus = "BLOCKED";
        if (moderationStatus === "RESTORED" && greetingStatus === "BLOCKED") {
          greetingStatus = publishedAt ? "PUBLISHED" : "DRAFT";
        }
        const { error } = await db.from("admin_audit_logs").insert({
          id: crypto.randomUUID(),
          greeting_id: row.id,
          actor: "demo-admin",
          action: "MODERATION_STATUS_CHANGED",
          previous_value: row.moderation_status,
          next_value: moderationStatus,
          reason: sanitizePlainText(payload.reason ?? "", 300),
          created_at: now.toISOString(),
        });
        if (error) throw error;
        break;
      }
    }

    const nextDraft: GreetingDraft = {
      ...draft,
      greetingStatus,
      paymentStatus,
      engagementStatus,
      moderationStatus,
      slug: slug ?? "",
      updatedAt: now.toISOString(),
    };
    const expiresAt =
      payload.action === "publish"
        ? new Date(now.getTime() + nextDraft.expiresInDays * 86_400_000).toISOString()
        : row.expires_at;

    const { error: updateError } = await db
      .from("greetings")
      .update({
        greeting_status: greetingStatus,
        payment_status: paymentStatus,
        engagement_status: engagementStatus,
        moderation_status: moderationStatus,
        slug,
        draft_json: nextDraft as unknown as Record<string, unknown>,
        first_opened_at: firstOpenedAt,
        last_opened_at: lastOpenedAt,
        total_view_count: totalViewCount,
        unique_view_count: uniqueViewCount,
        published_at: publishedAt,
        expires_at: expiresAt,
        updated_at: now.toISOString(),
      })
      .eq("id", row.id);
    if (updateError) throw updateError;

    return Response.json({ greeting: nextDraft });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
