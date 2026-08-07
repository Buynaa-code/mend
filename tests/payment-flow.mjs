import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const demoSecret = process.env.PAYMENT_DEMO_SECRET;

if (!demoSecret) {
  throw new Error("PAYMENT_DEMO_SECRET is required.");
}

async function json(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const image = await readFile(
  new URL("../public/assets/mend-giraffe.png", import.meta.url),
);
const form = new FormData();
form.append("file", new Blob([image], { type: "image/png" }), "mascot.png");
const uploaded = await json(
  await fetch(`${baseUrl}/api/media`, { method: "POST", body: form }),
);

const draft = {
  currentStep: 3,
  recipientName: "Тест Ану",
  senderName: "mend test",
  template: "cute",
  headline: "Төрсөн өдрийн мэнд!",
  message: "Аз жаргал хүсье.",
  surpriseMessage: "Сайхан баярлаарай.",
  musicUrl: "",
  musicName: "",
  photos: [uploaded.url],
  birthdayDate: "2026-12-01",
  mascot: "giraffe",
  lockUntilBirthday: true,
};

const checkoutResponse = await fetch(`${baseUrl}/api/checkout`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    draft,
    email: `payment-test-${Date.now()}@example.com`,
  }),
});
assert.equal(checkoutResponse.status, 201);
const checkout = await checkoutResponse.json();
assert.ok(checkout.paymentId);
assert.ok(checkout.clientSecret);
const paymentHeaders = { "x-payment-secret": checkout.clientSecret };

const pending = await json(
  await fetch(
    `${baseUrl}/api/payment-status?id=${encodeURIComponent(checkout.paymentId)}`,
    { headers: paymentHeaders },
  ),
);
assert.equal(pending.payment.status, "requires_action");

const directPublish = await fetch(`${baseUrl}/api/greetings`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ draft }),
});
assert.equal(directPublish.status, 402);

await json(
  await fetch(`${baseUrl}/api/payments/demo-confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-demo-secret": demoSecret,
    },
    body: JSON.stringify({ paymentId: checkout.paymentId }),
  }),
);

const paid = await json(
  await fetch(
    `${baseUrl}/api/payment-status?id=${encodeURIComponent(checkout.paymentId)}`,
    { headers: paymentHeaders },
  ),
);
assert.equal(paid.payment.status, "succeeded");
assert.match(paid.payment.accessCode, /^BDY-[A-Z0-9]{6}$/);

function publish() {
  return fetch(`${baseUrl}/api/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", ...paymentHeaders },
    body: JSON.stringify({ code: paid.payment.accessCode }),
  });
}

const firstResponse = await publish();
assert.equal(firstResponse.status, 201);
const first = await firstResponse.json();
assert.equal(first.mascot, draft.mascot);

// `1 төлбөр = 1 линк` — зарцуулсан кодоор дахин нийтлэх боломжгүй.
const reuseResponse = await publish();
assert.equal(reuseResponse.status, 409);

const publicResponse = await fetch(
  `${baseUrl}/api/greetings?slug=${encodeURIComponent(first.publicSlug)}`,
);
assert.equal(publicResponse.status, 200);
const publicText = await publicResponse.text();
assert.doesNotMatch(
  publicText,
  /ownerToken|owner_token|ownerEmail|paymentId|client_secret/i,
);
// Дүр болон түгжээний сонголт нийтлэгдсэн мэндчилгээ дээр хадгалагдана.
const publicGreeting = JSON.parse(publicText).greeting;
assert.equal(publicGreeting.mascot, draft.mascot);
assert.equal(publicGreeting.lockUntilBirthday, draft.lockUntilBirthday);

const dashboardResponse = await fetch(
  `${baseUrl}/api/greetings?dashboard=1`,
  { headers: { authorization: `Bearer ${first.ownerToken}` } },
);
assert.equal(dashboardResponse.status, 200);

const finalStatus = await json(
  await fetch(
    `${baseUrl}/api/payment-status?id=${encodeURIComponent(checkout.paymentId)}`,
    { headers: paymentHeaders },
  ),
);
assert.equal(finalStatus.payment.codeStatus, "used");
assert.equal(finalStatus.payment.publication.publicSlug, first.publicSlug);
// Баримт дээрх дүр нь сонгосон дүртэйгээ таарна.
assert.equal(finalStatus.payment.publication.mascot, draft.mascot);

console.log(
  JSON.stringify(
    {
      checkout: checkoutResponse.status,
      pending: pending.payment.status,
      directPublish: directPublish.status,
      payment: paid.payment.status,
      code: paid.payment.accessCode,
      publish: firstResponse.status,
      reuse: reuseResponse.status,
      public: publicResponse.status,
      dashboard: dashboardResponse.status,
      codeStatus: finalStatus.payment.codeStatus,
      mascot: publicGreeting.mascot,
      lockUntilBirthday: publicGreeting.lockUntilBirthday,
      slug: first.publicSlug,
    },
    null,
    2,
  ),
);

