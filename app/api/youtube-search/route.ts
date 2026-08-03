import { ensureSchema, getAppBindings } from "../../../db";
import { enforceRateLimit, RateLimitError } from "../../lib/server/security";

type YoutubeThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type YoutubeApiItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: Record<string, YoutubeThumbnail>;
  };
};

type YoutubeApiResponse = {
  items?: YoutubeApiItem[];
  error?: { message?: string; errors?: Array<{ reason?: string }> };
};

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code) || 0),
    );
}

function pickThumbnail(
  thumbnails: Record<string, YoutubeThumbnail> | undefined,
) {
  if (!thumbnails) return "";
  return (
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    thumbnails.high?.url ||
    ""
  );
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    await enforceRateLimit(request, "youtube-search", 30, 60_000);

    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
    if (query.length < 2) {
      return json({ error: "Хайх үг хамгийн багадаа 2 тэмдэгт." }, 400);
    }

    const bindings = await getAppBindings();
    const apiKey = bindings.YOUTUBE_API_KEY?.trim();
    if (!apiKey) {
      return json(
        {
          error:
            "YouTube хайлт server-т тохируулаагүй байна. Линкээ шууд хуулж оруулна уу.",
          user_error: true,
        },
        503,
      );
    }

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "10",
      q: query,
      videoEmbeddable: "true",
      safeSearch: "none",
      key: apiKey,
    });

    const upstream = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { headers: { accept: "application/json" } },
    );
    const data = (await upstream.json()) as YoutubeApiResponse;

    if (!upstream.ok) {
      const reason = data.error?.errors?.[0]?.reason ?? "";
      const message = data.error?.message ?? "YouTube хайлт амжилтгүй.";
      if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
        return json(
          {
            error: "YouTube хайлтын өдрийн quota дууссан. Маргааш дахин үзнэ үү.",
            user_error: true,
          },
          503,
        );
      }
      return json({ error: message }, 502);
    }

    const items = (data.items ?? [])
      .map((item) => ({
        videoId: item.id?.videoId ?? "",
        title: decodeEntities(item.snippet?.title ?? ""),
        channelTitle: decodeEntities(item.snippet?.channelTitle ?? ""),
        thumbnail: pickThumbnail(item.snippet?.thumbnails),
      }))
      .filter((item) => item.videoId);

    return json(
      { items },
      200,
      {
        "cache-control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    );
  } catch (caught) {
    if (caught instanceof RateLimitError) {
      return json({ error: caught.message }, caught.status);
    }
    const message =
      caught instanceof Error ? caught.message : "YouTube хайлт амжилтгүй.";
    return json({ error: message }, 500);
  }
}
