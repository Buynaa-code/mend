import { getMediaBucket } from "../../../db";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const audioTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
]);

function extensionFor(type: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
  };
  return extensions[type] ?? "bin";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Файл сонгоогүй байна." }, { status: 400 });
    }

    const isImage = imageTypes.has(file.type);
    const isAudio = audioTypes.has(file.type);
    if (!isImage && !isAudio) {
      return Response.json(
        { error: "JPG, PNG, WEBP, MP3, M4A, OGG эсвэл WAV файл оруулна уу." },
        { status: 415 },
      );
    }
    const maxBytes = isImage ? 8 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        { error: isImage ? "Зураг 8MB-аас ихгүй байна." : "Дуу 15MB-аас ихгүй байна." },
        { status: 413 },
      );
    }

    const key = `greetings/${isImage ? "images" : "audio"}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const bucket = await getMediaBucket();
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    return Response.json({
      key,
      url: `/api/media?key=${encodeURIComponent(key)}`,
      name: file.name,
    });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Файл байршуулж чадсангүй.";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** `bytes=0-1023`, `bytes=500-`, `bytes=-500` хэлбэрийн Range-ийг задална. */
function parseRange(header: string | null, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;
  let start: number;
  let end: number;
  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return { unsatisfiable: true as const };
  end = Math.min(end, size - 1);
  return { start, end, length: end - start + 1 };
}

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || !key.startsWith("greetings/")) {
      return new Response("Not found", { status: 404 });
    }
    const bucket = await getMediaBucket();

    const head = await bucket.head(key);
    if (!head) return new Response("Not found", { status: 404 });
    const size = head.size;
    const range = parseRange(request.headers.get("range"), size);

    const baseHeaders = new Headers();
    head.writeHttpMetadata(baseHeaders);
    baseHeaders.set("cache-control", "public, max-age=31536000, immutable");
    baseHeaders.set("etag", head.httpEtag);
    baseHeaders.set("x-content-type-options", "nosniff");
    // Safari (iOS дээр ялангуяа) дуу тоглуулахын өмнө byte-range хүсдэг ба
    // сервер 206 буцаахгүй бол audio элемент огт эхэлдэггүй.
    baseHeaders.set("accept-ranges", "bytes");

    if (range && "unsatisfiable" in range) {
      baseHeaders.set("content-range", `bytes */${size}`);
      return new Response(null, { status: 416, headers: baseHeaders });
    }

    if (request.method === "HEAD") {
      baseHeaders.set("content-length", String(size));
      return new Response(null, { status: 200, headers: baseHeaders });
    }

    if (range) {
      const object = await bucket.get(key, {
        range: { offset: range.start, length: range.length },
      });
      if (!object) return new Response("Not found", { status: 404 });
      baseHeaders.set(
        "content-range",
        `bytes ${range.start}-${range.end}/${size}`,
      );
      baseHeaders.set("content-length", String(range.length));
      return new Response(object.body, { status: 206, headers: baseHeaders });
    }

    const object = await bucket.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    baseHeaders.set("content-length", String(size));
    return new Response(object.body, { status: 200, headers: baseHeaders });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function HEAD(request: Request) {
  return GET(request);
}
