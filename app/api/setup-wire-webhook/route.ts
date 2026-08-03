import { getAppBindings } from "../../../db";
import { jsonError } from "../../lib/server/payments";
import { constantTimeEqual } from "../../lib/server/security";
import { registerWireWebhook } from "../../lib/server/wire";

export async function POST(request: Request) {
  const bindings = await getAppBindings();
  const setupToken = bindings.WIRE_SETUP_TOKEN?.trim();
  if (!setupToken) {
    return jsonError("WIRE_SETUP_TOKEN тохируулаагүй байна.", 503);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!bearer || !constantTimeEqual(bearer, setupToken)) {
    return jsonError("Setup token буруу байна.", 401);
  }

  const publicUrl = bindings.PUBLIC_APP_URL?.trim();
  if (!publicUrl) {
    return jsonError("PUBLIC_APP_URL тохируулаагүй байна.", 400);
  }

  const webhookUrl = new URL("/api/webhooks/wire", publicUrl).toString();

  try {
    const created = await registerWireWebhook({ url: webhookUrl });
    return Response.json({
      ok: true,
      webhookUrl,
      webhookId: created.id,
      secret: created.secret,
      status: created.status,
      note:
        "WIRE_WEBHOOK_SECRET-т `secret` утгыг хуулж env-т нэмээд redeploy хийнэ үү.",
    });
  } catch (caught) {
    const message =
      caught instanceof Error
        ? caught.message
        : "wire.mn webhook бүртгэж чадсангүй.";
    return jsonError(message, 502);
  }
}
