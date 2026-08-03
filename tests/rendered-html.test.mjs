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
  assert.match(html, /Photo collage/);
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
  assert.match(source, /6,900₮/);
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
  assert.match(html, /6,900₮/);
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
