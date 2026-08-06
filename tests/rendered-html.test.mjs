import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mascotVariants = [
  ...["", "-pout", "-celebrate", "-camera", "-letter", "-music", "-cake"].map(
    (pose) => `mend-fawn${pose}.png`,
  ),
  ...["", "-pout", "-celebrate", "-camera", "-letter", "-music", "-cake"].map(
    (pose) => `mend-tiger${pose}.png`,
  ),
];

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the creator route", async () => {
  const response = await render("/create");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>mend\./i);
  assert.match(html, /mend creator/i);
  assert.match(html, /Загвараа сонго/);
  for (const templateName of [
    "Candy Pop",
    "Midnight Rose",
    "Electric Party",
    "Memory Zine",
    "Cosmic Dream",
    "Groovy 70s",
    "Modern Muse",
    "Desert Bloom",
  ]) {
    assert.match(html, new RegExp(templateName));
  }
  assert.match(html, /Dashboard/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("does not expose starter metadata", async () => {
  const response = await render("/create");
  const html = await response.text();
  assert.doesNotMatch(html, /Starter Project|Your site is taking shape/i);
  assert.match(html, /Төрсөн өдрийн мэндчилгээ/);
});

test("renders dashboard and public greeting routes", async () => {
  const dashboard = await render("/dashboard");
  assert.equal(dashboard.status, 200);
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, /OWNER DASHBOARD/);
  assert.match(dashboardHtml, /Таны мэндчилгээнүүд/);

  const greeting = await render("/g/demo-birthday");
  assert.equal(greeting.status, 200);
  const greetingHtml = await greeting.text();
  assert.match(greetingHtml, /Мэндчилгээг бэлдэж байна/);
  assert.doesNotMatch(greetingHtml, /ownerToken|owner_token|authorization/i);
});

test("renders the protected payment route", async () => {
  const response = await render("/pay");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /SECURE CHECKOUT/);
  assert.match(html, /1 төлбөр = 1 нийтлэгдсэн/);
  assert.match(html, /Линкээ идэвхжүүлэх/);
  assert.doesNotMatch(html, /QPAY_CLIENT_SECRET|APP_SECRET|owner_token_hash/i);
});

test("creator requires checkout instead of direct publishing", async () => {
  const source = await readFile(
    new URL("../app/BirthdayApp.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /5,500₮/);
  assert.match(source, /Encrypted checkout/);
  assert.match(source, /fetch\("\/api\/checkout"/);
  assert.doesNotMatch(source, />Тусгай линк үүсгэх</);
});

test("root renders landing page with template gallery", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /landing-root/);
  assert.match(html, /landing-tmpl-card/);
  assert.match(html, /8 mood, 8 өнгө/);
  assert.match(html, /5,500₮/);
  assert.match(html, /href="\/create\?template=cute"/);
});

test("ships every transparent mascot pose", async () => {
  for (const filename of mascotVariants) {
    const fileUrl = new URL(`../public/assets/${filename}`, import.meta.url);
    const png = await readFile(fileUrl);

    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${filename} must be a PNG`,
    );
    assert.ok(
      [4, 6].includes(png[25]),
      `${filename} must include an alpha channel`,
    );
  }
});

test("selects the tiger mascot for male recipients", async () => {
  const source = await readFile(
    new URL("../app/BirthdayApp.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /recipientGender === "male"/);
  assert.match(source, /mend-tiger-celebrate\.png/);
  assert.match(source, /onClick=\{\(\) => update\(\{ recipientGender: "male" \}\)\}/);
});

test("offers a 9:16 social story sharing flow", async () => {
  const shareSource = await readFile(
    new URL("../app/StoryShareButton.tsx", import.meta.url),
    "utf8",
  );
  const paymentSource = await readFile(
    new URL("../app/PaymentApp.tsx", import.meta.url),
    "utf8",
  );

  assert.match(shareSource, /1080/);
  assert.match(shareSource, /1920/);
  assert.match(shareSource, /navigator\.share/);
  assert.match(shareSource, /Story-д оруулах/);
  assert.match(paymentSource, /StoryShareButton/);
});

test("keeps many-photo recipient greetings responsive", async () => {
  const recipientSource = await readFile(
    new URL("../app/BirthdayApp.tsx", import.meta.url),
    "utf8",
  );
  const templateStyles = await readFile(
    new URL("../app/template-worlds.css", import.meta.url),
    "utf8",
  );

  assert.match(recipientSource, /fetchPriority="high"/);
  assert.match(recipientSource, /loading=\{index < 4 \? "eager" : "lazy"\}/);
  assert.match(templateStyles, /\.recipient-experience \.screen-cover/);
  assert.match(templateStyles, /min-height: calc\(100svh - 94px\)/);
});

test("preview offers a photos gallery scene", async () => {
  const greetingLib = await readFile(
    new URL("../app/lib/greeting.ts", import.meta.url),
    "utf8",
  );
  const creatorSource = await readFile(
    new URL("../app/BirthdayApp.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(greetingLib, /^\s*\|\s*"photos"$/m);
  assert.match(creatorSource, /scene === "photos"/);
  assert.match(creatorSource, /id: "photos", label: "Зурагууд"/);
  assert.match(styles, /\.preview-photo-gallery/);
});

test("publish endpoint accepts one-time code with optional draft", async () => {
  const publishRoute = await readFile(
    new URL("../app/api/publish/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(publishRoute, /findAccessCodeByCode/);
  assert.match(publishRoute, /code\?: string;\s*draft\?: GreetingDraft;/);
  assert.match(publishRoute, /Нэг удаагийн код дутуу байна/);
  assert.match(publishRoute, /Энэ код аль хэдийн ашиглагдсан байна/);
  assert.doesNotMatch(publishRoute, /paymentId\?: string/);
});

test("creator exposes a manual one-time code publish flow", async () => {
  const creatorSource = await readFile(
    new URL("../app/BirthdayApp.tsx", import.meta.url),
    "utf8",
  );
  assert.match(creatorSource, /Код-оор нийтлэх/);
  assert.match(creatorSource, /publishWithCode/);
  assert.match(creatorSource, /body: JSON\.stringify\(\{ code, draft \}\)/);
  assert.match(creatorSource, /placeholder="BDY-XXXXXX"/);
});

test("publish step explains the pay-to-code-to-publish flow", async () => {
  const creatorSource = await readFile(
    new URL("../app/BirthdayApp.tsx", import.meta.url),
    "utf8",
  );
  const paymentSource = await readFile(
    new URL("../app/PaymentApp.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(creatorSource, /publish-flow-steps/);
  assert.match(creatorSource, /Нэг удаагийн код/);
  assert.match(creatorSource, /5,500₮ төлж код авах/);
  assert.match(creatorSource, /Алхам 1/);
  assert.match(creatorSource, /Алхам 2/);
  assert.match(paymentSource, /Таны нэг удаагийн код/);
  assert.match(styles, /\.publish-flow-steps/);
  assert.match(styles, /\.payment-code-card/);
});

test("admin route serves the email login form", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Админ нэвтрэлт/);
  assert.match(html, /type="email"/);
  assert.doesNotMatch(html, /ADMIN_API_SECRET/);
});

test("admin auth allowlists emails and mints signed session tokens", async () => {
  const adminHelper = await readFile(
    new URL("../app/lib/server/admin.ts", import.meta.url),
    "utf8",
  );
  const loginRoute = await readFile(
    new URL("../app/api/admin/login/route.ts", import.meta.url),
    "utf8",
  );
  const codesRoute = await readFile(
    new URL("../app/api/admin/access-codes/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(adminHelper, /gbuyandelger277@gmail\.com/);
  assert.match(adminHelper, /signValue\(secret, `admin:\$\{normalizeEmail\(email\)\}`\)/);
  assert.match(adminHelper, /constantTimeEqual\(expected, supplied\)/);
  assert.match(loginRoute, /isAdminEmail/);
  assert.match(loginRoute, /deriveAdminToken/);
  assert.match(codesRoute, /requireAdmin/);
  assert.doesNotMatch(codesRoute, /constantTimeEqual\(expected, supplied\)/);
});

test("payment page auto-publishes using the access code, not paymentId", async () => {
  const paymentSource = await readFile(
    new URL("../app/PaymentApp.tsx", import.meta.url),
    "utf8",
  );
  assert.match(paymentSource, /body: JSON\.stringify\(\{ code \}\)/);
  assert.match(paymentSource, /publishGreeting\(result\.payment\.accessCode\)/);
  assert.doesNotMatch(paymentSource, /body: JSON\.stringify\(\{ paymentId: id \}\)/);
});
