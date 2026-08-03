import { POST as handleWireWebhook } from "../webhooks/wire/route";

export function GET() {
  return Response.json({ ok: true, service: "wire-webhook" });
}

export function HEAD() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  return handleWireWebhook(request);
}
