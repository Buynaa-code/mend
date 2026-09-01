import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../public/assets/bolzoo-audio.js", import.meta.url),
  "utf8",
);

/**
 * bolzoo-audio.js нь браузерын жижиг хэсэгт л ханддаг тул бүрэн DOM-ын оронд
 * шаардлагатай API-г нь дуурайсан хиймэл орчинд ажиллуулж шалгана.
 */
function createEnvironment({ apiPreloaded = false } = {}) {
  const timers = [];
  let now = 0;
  const players = [];
  const elements = new Map();

  function createElement(tag) {
    return {
      tagName: tag,
      className: "",
      textContent: "",
      attributes: {},
      children: [],
      parentNode: null,
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      getAttribute(name) {
        return this.attributes[name] ?? null;
      },
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
    };
  }

  const documentStub = {
    head: createElement("head"),
    createElement,
    querySelector: () => null,
    getElementById: (id) => elements.get(id) ?? null,
  };

  const YT = {
    Player: function Player(node, options) {
      players.push({ node, options });
      this.node = node;
      this.options = options;
      this.calls = [];
      this.getIframe = () => node;
      this.setVolume = (value) => this.calls.push(["setVolume", value]);
      this.mute = () => this.calls.push(["mute"]);
      this.unMute = () => this.calls.push(["unMute"]);
      this.playVideo = () => this.calls.push(["playVideo"]);
      this.seekTo = (value) => this.calls.push(["seekTo", value]);
      this.destroy = () => this.calls.push(["destroy"]);
    },
  };

  const windowStub = {
    location: { origin: "https://mend.mn" },
    document: documentStub,
    setTimeout: (fn, ms) => {
      timers.push({ fn, at: now + (ms ?? 0) });
      return timers.length;
    },
    clearTimeout: (id) => {
      if (timers[id - 1]) timers[id - 1].cancelled = true;
    },
  };
  if (apiPreloaded) windowStub.YT = YT;

  const context = vm.createContext({ window: windowStub, document: documentStub });
  context.globalThis = context;
  vm.runInContext(source, context);

  return {
    window: windowStub,
    document: documentStub,
    YT,
    players,
    /** Виртуал цагийг урагшлуулж, хугацаа нь болсон timer-үүдийг ажиллуулна. */
    advance(ms = 1000) {
      const until = now + ms;
      for (let guard = 0; guard < 5000; guard += 1) {
        const next = timers
          .filter((timer) => !timer.done && !timer.cancelled && timer.at <= until)
          .sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        next.done = true;
        now = next.at;
        next.fn();
      }
      now = until;
    },
    mountHost(id) {
      const host = createElement("div");
      host.attributes.id = id;
      elements.set(id, host);
      return host;
    },
    addButton() {
      return createElement("button");
    },
  };
}

function init(env, overrides = {}) {
  return env.window.BolzooAudio.init({
    videoId: "dQw4w9WgXcQ",
    hostElId: "mend-yt-host",
    ...overrides,
  });
}

test("YouTube API аль хэдийн ачаалагдсан үед player үүсгэнэ", () => {
  const env = createEnvironment({ apiPreloaded: true });
  env.mountHost("mend-yt-host");
  init(env);
  env.advance();
  assert.equal(env.players.length, 1, "дахин mount хийхэд player үүсэх ёстой");
});

test("host дараа нь DOM-д орсон ч player үүснэ", () => {
  const env = createEnvironment({ apiPreloaded: true });
  init(env);
  env.advance();
  assert.equal(env.players.length, 0);
  // Түгжээ тайлагдсан / in-app browser gate хаагдсан агшин.
  env.mountHost("mend-yt-host");
  env.advance();
  assert.equal(env.players.length, 1);
});

test("host div-ийг iframe-ээр солиулахгүй, дотор нь хүү зангилаа өгнө", () => {
  const env = createEnvironment({ apiPreloaded: true });
  const host = env.mountHost("mend-yt-host");
  init(env);
  env.advance();
  assert.equal(env.players[0].node.parentNode, host);
  assert.notEqual(env.players[0].node, host);
});

test("товч дээр нэг товшилт нэг л удаа toggle хийнэ", () => {
  const env = createEnvironment({ apiPreloaded: true });
  env.mountHost("mend-yt-host");
  const button = env.addButton();
  const controller = init(env, { buttonEl: button });
  env.advance();
  // Player ready болсон гэж дуурайна.
  env.players[0].options.events.onReady();

  controller.toggle();
  assert.equal(button.getAttribute("aria-busy"), "true");
  // YouTube тоглож эхэлсэн эвент.
  env.players[0].options.events.onStateChange({ data: 1 });
  assert.equal(button.getAttribute("aria-pressed"), "true");

  controller.toggle();
  assert.equal(
    button.getAttribute("data-sound-state"),
    "muted",
    "нэг товшилт нам болгоод шууд буцааж асаах ёсгүй",
  );
});

test("embed хориотой видеон дээр алдаа мэдэгдэж, дахин оролдох боломж үлдээнэ", () => {
  const env = createEnvironment({ apiPreloaded: true });
  env.mountHost("mend-yt-host");
  const button = env.addButton();
  let failures = 0;
  const controller = init(env, { buttonEl: button, onFail: () => (failures += 1) });
  env.advance();
  env.players[0].options.events.onReady();
  env.players[0].options.events.onError({ data: 150 });

  assert.equal(failures, 1);
  assert.equal(controller.hasFailed(), true);
  assert.equal(button.getAttribute("data-sound-state"), "failed");

  controller.toggle();
  env.advance();
  assert.equal(controller.hasFailed(), false, "дахин оролдлого төлвийг сэргээнэ");
  assert.equal(env.players.length, 2, "дахин оролдоход шинэ player үүснэ");
});
