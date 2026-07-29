import { getAppBindings } from "../../../../db";
import {
  getPayment,
  jsonError,
  markPaymentSucceeded,
} from "../../../lib/server/payments";
import { constantTimeEqual } from "../../../lib/server/security";

export async function POST(request: Request) {
  const bindings = await getAppBindings();
  if (bindings.PAYMENT_PROVIDER_MODE?.toLowerCase() !== "demo") {
    return jsonError("Олдсонгүй.", 404);
  }
  const suppliedSecret = request.headers.get("x-demo-secret") ?? "";
  if (
    !bindings.PAYMENT_DEMO_SECRET ||
    !constantTimeEqual(suppliedSecret, bindings.PAYMENT_DEMO_SECRET)
  ) {
    return jsonError("Demo баталгаажуулалтын эрхгүй байна.", 401);
  }
  const payload = (await request.json()) as { paymentId?: string };
  const paymentId = String(payload.paymentId ?? "").trim();
  const payment = await getPayment(paymentId);
  if (!payment || payment.provider !== "demo") {
    return jsonError("Demo захиалга олдсонгүй.", 404);
  }
  const code = await markPaymentSucceeded(payment.id);
  return Response.json({ ok: true, codeStatus: code.status });
}
