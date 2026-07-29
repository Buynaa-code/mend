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

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || !key.startsWith("greetings/")) {
      return new Response("Not found", { status: 404 });
    }
    const bucket = await getMediaBucket();
    const object = await bucket.get(key);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("etag", object.httpEtag);
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
