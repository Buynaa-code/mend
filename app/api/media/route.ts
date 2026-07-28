import { getMediaBucket, getSupabaseAdmin } from "../../../db";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Зураг сонгоогүй байна." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type)) {
      return Response.json(
        { error: "JPG, PNG эсвэл WEBP зураг оруулна уу." },
        { status: 415 },
      );
    }
    if (file.size > maxBytes) {
      return Response.json(
        { error: "Зургийн хэмжээ 8MB-аас ихгүй байна." },
        { status: 413 },
      );
    }

    const db = getSupabaseAdmin();
    const extension =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `greetings/${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage
      .from(getMediaBucket())
      .upload(key, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;

    return Response.json({ key, url: `/api/media?key=${encodeURIComponent(key)}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload амжилтгүй боллоо.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || !key.startsWith("greetings/")) {
      return new Response("Not found", { status: 404 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db.storage.from(getMediaBucket()).download(key);
    if (error || !data) return new Response("Not found", { status: 404 });

    return new Response(data.stream(), {
      headers: {
        "content-type": data.type || "application/octet-stream",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
