import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mascotVariants = [
  "mend-giraffe.png",
  "mend-giraffe-pout.png",
  "mend-giraffe-celebrate.png",
  "mend-giraffe-camera.png",
  "mend-giraffe-letter.png",
  "mend-giraffe-music.png",
  "mend-giraffe-cake.png",
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

test("renders the birthday greeting application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>mend\./i);
  assert.match(html, /Бүтээгч/);
  assert.match(html, /Хүлээн авагч/);
  assert.match(html, /Админ/);
  assert.match(html, /birthday scrapbook/i);
  assert.match(html, /Хэнд зориулж байна\?/);
  assert.match(html, /MEND-TEST01/);
  assert.match(html, /Нэр ба эрх/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("does not expose starter metadata", async () => {
  const response = await render();
  const html = await response.text();
  assert.doesNotMatch(html, /Starter Project|Your site is taking shape/i);
  assert.match(html, /Төрсөн өдрийн мэндчилгээ/);
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
