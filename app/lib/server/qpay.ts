import { getAppBindings } from "../../../db";
import type { PaymentRow } from "./payments";
import {
  GREETING_PRICE,
  PaymentConfigurationError,
  signWebhook,
} from "./payments";

type QPayUrl = {
  name?: string;
  description?: string;
  logo?: string;
  link?: string;
};

type QPayInvoiceResponse = {
  invoice_id?: string;
  qr_text?: string;
  qr_image?: string;
  qPay_shortUrl?: string;
  urls?: QPayUrl[];
  message?: string;
};

type QPayCheckResponse = {
  rows?: Array<{
    payment_id?: string;
    payment_status?: string;
    payment_amount?: number;
    amount?: number;
  }>;
};

type QPayTokenResponse = {
  access_token?: string;
  expires_in?: number;
  message?: string;
};

let tokenCache:
  | {
      key: string;
      token: string;
      expiresAt: number;
    }
  | undefined;

function providerMode(value?: string) {
  return value?.trim().toLowerCase() === "demo" ? "demo" : "qpay";
}

function parseInvoiceOptions(value?: string) {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new PaymentConfigurationError(
      "QPAY_INVOICE_OPTIONS_JSON буруу JSON байна.",
    );
  }
}

export async function assertProviderConfiguration() {
  const bindings = await getAppBindings();
  if (providerMode(bindings.PAYMENT_PROVIDER_MODE) === "demo") {
    if (!bindings.PAYMENT_DEMO_SECRET || bindings.PAYMENT_DEMO_SECRET.length < 16) {
      throw new PaymentConfigurationError(
        "Demo төлбөрийн server тохиргоо дутуу байна.",
      );
    }
    return;
  }

  const required = [
    bindings.QPAY_CLIENT_ID,
    bindings.QPAY_CLIENT_SECRET,
    bindings.QPAY_INVOICE_CODE,
  ];
  if (required.some((value) => !value?.trim())) {
    throw new PaymentConfigurationError(
      "QPay merchant тохиргоо хараахан холбогдоогүй байна.",
    );
  }
  parseInvoiceOptions(bindings.QPAY_INVOICE_OPTIONS_JSON);
}

async function getQPayToken() {
  const bindings = await getAppBindings();
  await assertProviderConfiguration();
  const baseUrl = (
    bindings.QPAY_BASE_URL || "https://merchant.qpay.mn"
  ).replace(/\/+$/, "");
  const clientId = bindings.QPAY_CLIENT_ID!.trim();
  const clientSecret = bindings.QPAY_CLIENT_SECRET!.trim();
  const cacheKey = `${baseUrl}:${clientId}`;
  if (
    tokenCache?.key === cacheKey &&
    tokenCache.expiresAt > Date.now() + 30_000
  ) {
    return { baseUrl, token: tokenCache.token };
  }

  const response = await fetch(`${baseUrl}/v2/auth/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "content-type": "application/json",
    },
  });
  const data = (await response.json()) as QPayTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.message || "QPay access token авч чадсангүй.");
  }
  tokenCache = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
  };
  return { baseUrl, token: data.access_token };
}

export async function createProviderInvoice(input: {
  paymentId: string;
  orderId: string;
  recipientCode: string;
  email: string;
  callbackOrigin: string;
}) {
  const bindings = await getAppBindings();
  await assertProviderConfiguration();
  const mode = providerMode(bindings.PAYMENT_PROVIDER_MODE);
  if (mode === "demo") {
    return {
      provider: "demo",
      invoiceId: `demo-${input.paymentId}`,
      qrText: `MEND-DEMO-${input.orderId}`,
      qrImage: "",
      shortUrl: "",
      deeplinks: [],
    };
  }

  const { baseUrl, token } = await getQPayToken();
  const callbackTimestamp = String(Math.floor(Date.now() / 1000));
  const callback = new URL("/api/webhooks/qpay", input.callbackOrigin);
  callback.searchParams.set("payment", input.paymentId);
  callback.searchParams.set("ts", callbackTimestamp);
  callback.searchParams.set(
    "sig",
    await signWebhook(input.paymentId, callbackTimestamp),
  );

  const merchantOptions = parseInvoiceOptions(
    bindings.QPAY_INVOICE_OPTIONS_JSON,
  );
  const payload = {
    sender_branch_code: bindings.QPAY_BRANCH_CODE || "ONLINE",
    sender_branch_data: {},
    sender_staff_code: bindings.QPAY_STAFF_CODE || "WEB",
    sender_staff_data: {},
    sender_terminal_code: bindings.QPAY_TERMINAL_CODE || "MEND",
    sender_terminal_data: {},
    subscription_interval: "",
    subscription_webhook: "",
    note: input.orderId,
    calculate_vat: false,
    tax_customer_code: "",
    line_tax_code: bindings.QPAY_LINE_TAX_CODE || "",
    district_code: bindings.QPAY_DISTRICT_CODE || "",
    tax_type: bindings.QPAY_TAX_TYPE || "",
    lines: [],
    transactions: [],
    lottery: [],
    ...merchantOptions,
    invoice_code: bindings.QPAY_INVOICE_CODE,
    sender_invoice_no: input.orderId,
    invoice_receiver_code: input.recipientCode,
    invoice_receiver_data: { email: input.email },
    invoice_description: `Mend birthday greeting ${input.orderId}`,
    enable_expiry: true,
    allow_partial: false,
    minimum_amount: GREETING_PRICE,
    allow_exceed: false,
    maximum_amount: GREETING_PRICE,
    amount: GREETING_PRICE,
    callback_url: callback.toString(),
    allow_subscribe: false,
  };

  const response = await fetch(`${baseUrl}/v2/invoice`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as QPayInvoiceResponse;
  if (!response.ok || !data.invoice_id || !data.qr_text) {
    throw new Error(data.message || "QPay нэхэмжлэх үүсгэж чадсангүй.");
  }

  return {
    provider: "qpay",
    invoiceId: data.invoice_id,
    qrText: data.qr_text,
    qrImage: data.qr_image || "",
    shortUrl: data.qPay_shortUrl || "",
    deeplinks: (data.urls ?? [])
      .filter((item) => item.name && item.link)
      .map((item) => ({
        name: item.name!,
        description: item.description || "",
        logo: item.logo || "",
        link: item.link!,
      })),
  };
}

export async function confirmProviderPayment(payment: PaymentRow) {
  if (payment.provider === "demo") {
    throw new Error("Demo төлбөрийг webhook-оор баталгаажуулахгүй.");
  }
  if (!payment.provider_invoice_id) {
    throw new Error("QPay invoice ID олдсонгүй.");
  }
  const { baseUrl, token } = await getQPayToken();
  const response = await fetch(`${baseUrl}/v2/payment/check`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: payment.provider_invoice_id,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  const data = (await response.json()) as QPayCheckResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message || "QPay төлбөрийг шалгаж чадсангүй.");
  }
  const paidRows = (data.rows ?? []).filter(
    (row) => row.payment_status?.toUpperCase() === "PAID",
  );
  const paidAmount = paidRows.reduce(
    (sum, row) => sum + Number(row.payment_amount ?? row.amount ?? 0),
    0,
  );
  return {
    confirmed:
      paidRows.length > 0 && Math.abs(paidAmount - payment.amount) < 0.01,
    eventId:
      paidRows.map((row) => row.payment_id).filter(Boolean).join(",") ||
      payment.provider_invoice_id,
    paidAmount,
  };
}
