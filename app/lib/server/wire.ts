import { getAppBindings } from "../../../db";
import type { PaymentRow } from "./payments";
import {
  GREETING_PRICE,
  PAYMENT_CURRENCY,
  PaymentConfigurationError,
} from "./payments";
import { constantTimeEqual } from "./security";

/**
 * `next_action` is free-form in the API reference, but the wire.mn hosted
 * checkout page reads it as `{ type, qr: { text, image_url, deeplinks } }` —
 * so a QPay intent exposes its QR payload and bank deeplinks under `qr`.
 */
type WireNextAction = {
  type?: string;
  qr?: {
    text?: string;
    image_url?: string;
    deeplinks?: Array<{
      name?: string;
      link?: string;
      logo?: string;
    }>;
  };
} | null | undefined;

type WirePaymentIntent = {
  id?: string;
  object?: string;
  amount?: number;
  currency?: string;
  status?: string;
  client_secret?: string;
  selected_operator?: string;
  next_action?: WireNextAction;
  metadata?: Record<string, unknown>;
  livemode?: boolean;
  created?: number;
  expires_at?: number;
};

type WireErrorPayload = {
  error?: {
    type?: string;
    code?: string;
    message?: string;
    param?: string;
    request_id?: string;
  };
};

type WireOperatorConnectionList = {
  data?: Array<{
    operator?: string;
    status?: string;
  }>;
};

type WireCheckoutSession = {
  id?: string;
  object?: string;
  url?: string;
  payment_intent?: string;
};

export function isWireMode(mode?: string) {
  return mode?.trim().toLowerCase() === "wire";
}

function readWireBase(bindings: { WIRE_API_BASE?: string }) {
  return (bindings.WIRE_API_BASE || "https://api.wire.mn").replace(
    /\/+$/,
    "",
  );
}

export async function assertWireConfiguration() {
  const bindings = await getAppBindings();
  const apiKey = bindings.WIRE_API_KEY?.trim();
  if (!apiKey) {
    throw new PaymentConfigurationError(
      "wire.mn API key тохируулаагүй байна.",
    );
  }
}

export async function getWireAllowedOperators() {
  await assertWireConfiguration();
  const bindings = await getAppBindings();
  const apiKey = bindings.WIRE_API_KEY!.trim();

  if (apiKey.startsWith("sk_test_")) {
    return ["sandbox"];
  }

  const connections = await wireRequest<WireOperatorConnectionList>(
    "/v1/operator_connections?limit=100",
    { method: "GET" },
  );
  const operators = [
    ...new Set(
      (connections.data ?? [])
        .filter(
          (connection) =>
            connection.status?.trim().toLowerCase() === "active",
        )
        .map((connection) => connection.operator?.trim() ?? "")
        .filter(Boolean),
    ),
  ];

  if (operators.length === 0) {
    throw new PaymentConfigurationError(
      "wire.mn дээр идэвхтэй төлбөрийн оператор алга. Dashboard → Холболтууд хэсэгт QPay эсвэл бусад оператороо идэвхжүүлнэ үү.",
    );
  }

  return operators;
}

async function wireRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const bindings = await getAppBindings();
  const baseUrl = readWireBase(bindings);
  const apiKey = bindings.WIRE_API_KEY!.trim();

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${apiKey}`);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.idempotencyKey) {
    headers.set("idempotency-key", init.idempotencyKey);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch (caught) {
    const cause = caught instanceof Error ? caught.message : String(caught);
    throw new Error(`wire.mn холбогдож чадсангүй: ${cause}`);
  }
  const text = await response.text();
  let data: T & WireErrorPayload;
  try {
    data = text
      ? (JSON.parse(text) as T & WireErrorPayload)
      : ({} as T & WireErrorPayload);
  } catch {
    data = {
      error: { message: text.slice(0, 200) },
    } as T & WireErrorPayload;
  }
  if (!response.ok) {
    const detail = (data as WireErrorPayload)?.error?.message;
    const code = (data as WireErrorPayload)?.error?.code;
    throw new Error(
      `wire.mn ${response.status}${code ? ` [${code}]` : ""}: ${
        detail || text.slice(0, 200) || response.statusText
      }`,
    );
  }
  return data as T;
}

export type WireDeeplink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

function isSafeLink(value: string) {
  return Boolean(value) && !/^\s*(javascript|data|vbscript):/i.test(value);
}

function extractOperatorArtifacts(nextAction: WireNextAction) {
  const empty = {
    qrText: "",
    qrImage: "",
    deeplinks: [] as WireDeeplink[],
  };
  const qr = nextAction?.qr;
  if (!qr) return empty;

  const image = String(qr.image_url ?? "");
  const deeplinks = (qr.deeplinks ?? [])
    .map((item) => {
      const name = String(item?.name ?? "");
      const link = String(item?.link ?? "");
      if (!name || !isSafeLink(link)) return null;
      return { name, description: "", logo: String(item?.logo ?? ""), link };
    })
    .filter((item): item is WireDeeplink => item !== null);

  return {
    qrText: String(qr.text ?? ""),
    // Only http(s) or data URIs — never let a hostile value reach an <img src>.
    qrImage: image.startsWith("data:image/") || isHttpsUrl(image) ? image : "",
    deeplinks,
  };
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Hosted checkout sessions are documented as form-encoded, but the rest of the
 * API also speaks JSON. Try the documented shape first and fall back once so a
 * format mismatch cannot take checkout down.
 */
async function createWireCheckoutSession(input: {
  paymentId: string;
  paymentIntentId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const fields: Record<string, string> = {
    payment_intent: input.paymentIntentId,
  };
  if (isHttpsUrl(input.successUrl)) fields.success_url = input.successUrl;
  if (isHttpsUrl(input.cancelUrl)) fields.cancel_url = input.cancelUrl;

  const idempotencyKey = `${input.paymentId}:checkout-session`;
  try {
    return await wireRequest<WireCheckoutSession>("/v1/checkout/sessions", {
      method: "POST",
      idempotencyKey,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    });
  } catch (formError) {
    try {
      return await wireRequest<WireCheckoutSession>("/v1/checkout/sessions", {
        method: "POST",
        idempotencyKey,
        body: JSON.stringify(fields),
      });
    } catch {
      throw formError;
    }
  }
}

/**
 * Creates a PaymentIntent, reserves a hosted checkout URL for it, then confirms
 * it so the QR payload and bank deeplinks can be shown on our own /pay page.
 *
 * The session is opened before the confirm on purpose: sessions are only
 * accepted while the intent is still in `requires_payment_method`. Confirming
 * afterwards leaves the hosted page working — it renders whatever `next_action`
 * the intent already carries — so it stays a usable fallback if the confirm or
 * the artifact extraction comes back empty.
 */
export async function createWireInvoice(input: {
  paymentId: string;
  orderId: string;
  email: string;
  allowedOperators: string[];
  successUrl: string;
  cancelUrl: string;
}) {
  await assertWireConfiguration();
  const bindings = await getAppBindings();
  const description = (bindings.PAYMENT_DESCRIPTION || "mend birthday greeting")
    .slice(0, 80);

  const created = await wireRequest<WirePaymentIntent>("/v1/payment_intents", {
    method: "POST",
    idempotencyKey: `${input.paymentId}:create`,
    body: JSON.stringify({
      amount: GREETING_PRICE,
      currency: PAYMENT_CURRENCY,
      description,
      // Let wire.mn pick the operator, so the confirm below needs no choice
      // from us. It does not dispatch at create time, so the checkout session
      // still sees the intent in `requires_payment_method`.
      automatic_operator: true,
      allowed_operators: input.allowedOperators,
      metadata: {
        payment_id: input.paymentId,
        order_id: input.orderId,
        email: input.email,
        description,
      },
    }),
  });

  if (!created.id) {
    throw new Error("wire.mn PaymentIntent ID буцаагаагүй.");
  }

  const session = await createWireCheckoutSession({
    paymentId: input.paymentId,
    paymentIntentId: created.id,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });

  const checkoutUrl = String(session.url ?? "");
  if (!checkoutUrl) {
    throw new Error("wire.mn checkout session URL буцаагаагүй.");
  }

  // A failed confirm is not fatal: the hosted page can still take the payment.
  let artifacts = { qrText: "", qrImage: "", deeplinks: [] as WireDeeplink[] };
  try {
    const confirmed = await wireRequest<WirePaymentIntent>(
      `/v1/payment_intents/${encodeURIComponent(created.id)}/confirm`,
      {
        method: "POST",
        idempotencyKey: `${input.paymentId}:confirm`,
        body: JSON.stringify({}),
      },
    );
    artifacts = extractOperatorArtifacts(confirmed.next_action);
  } catch {
    // Fall through with empty artifacts and rely on the hosted checkout URL.
  }

  return {
    provider: "wire" as const,
    invoiceId: created.id,
    qrText: artifacts.qrText,
    qrImage: artifacts.qrImage,
    shortUrl: checkoutUrl,
    deeplinks: artifacts.deeplinks,
  };
}

export async function confirmWirePayment(payment: PaymentRow) {
  if (payment.provider !== "wire") {
    throw new Error("wire.mn биш захиалгыг wire-ээр баталгаажуулах боломжгүй.");
  }
  if (!payment.provider_invoice_id) {
    throw new Error("wire.mn PaymentIntent ID олдсонгүй.");
  }
  const intent = await wireRequest<WirePaymentIntent>(
    `/v1/payment_intents/${encodeURIComponent(payment.provider_invoice_id)}`,
    { method: "GET" },
  );
  const status = (intent.status || "").toLowerCase();
  const amount = Number(intent.amount ?? 0);
  const confirmed = status === "succeeded" && amount === payment.amount;
  return {
    confirmed,
    status,
    paidAmount: amount,
    eventId: intent.id || payment.provider_invoice_id,
  };
}

function parseSignatureHeader(header: string) {
  const parts = header.split(",").map((entry) => entry.trim());
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    if (key === "t") timestamp = Number(value);
    else if (key === "v1") signatures.push(value);
  }
  return { timestamp, signatures };
}

async function hmacSha256Hex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyWireSignature(
  rawBody: string,
  header: string | null,
  toleranceSeconds = 300,
) {
  if (!header) return false;
  const bindings = await getAppBindings();
  const secret = bindings.WIRE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const { timestamp, signatures } = parseSignatureHeader(header);
  if (!timestamp || signatures.length === 0) return false;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > toleranceSeconds) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((candidate) => constantTimeEqual(expected, candidate));
}

export async function registerWireWebhook(input: {
  url: string;
  enabledEvents?: string[];
}) {
  await assertWireConfiguration();
  const body = {
    url: input.url,
    enabled_events: input.enabledEvents ?? [
      "payment_intent.succeeded",
      "payment_intent.canceled",
      "payment_intent.failed",
    ],
  };
  return wireRequest<{
    id?: string;
    url?: string;
    enabled_events?: string[];
    secret?: string;
    status?: string;
  }>("/v1/webhook_endpoints", {
    method: "POST",
    idempotencyKey: `setup-${input.url}`,
    body: JSON.stringify(body),
  });
}
