import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const workerConfig = {
  name: "mend",
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
};

// Cloudflare Workers Builds sets CI=true. Detect that so `command === "build"`
// still receives the real D1/R2 bindings and public vars, while secrets stay
// out of the artifact (set them via `wrangler secret put`).
const isCloudflareBuild =
  process.env.CI === "true" || process.env.CF_PAGES === "1";

const productionBindingConfig = {
  ...workerConfig,
  vars: {
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? "",
    PAYMENT_PROVIDER_MODE: process.env.PAYMENT_PROVIDER_MODE ?? "wire",
    PAYMENT_TTL_MINUTES: process.env.PAYMENT_TTL_MINUTES ?? "10",
    ACCESS_CODE_TTL_DAYS: process.env.ACCESS_CODE_TTL_DAYS ?? "30",
    QPAY_BASE_URL:
      process.env.QPAY_BASE_URL ?? "https://merchant-sandbox.qpay.mn",
    QPAY_BRANCH_CODE: process.env.QPAY_BRANCH_CODE ?? "ONLINE",
    QPAY_STAFF_CODE: process.env.QPAY_STAFF_CODE ?? "WEB",
    QPAY_TERMINAL_CODE: process.env.QPAY_TERMINAL_CODE ?? "MEND",
    QPAY_LINE_TAX_CODE: process.env.QPAY_LINE_TAX_CODE ?? "",
    QPAY_DISTRICT_CODE: process.env.QPAY_DISTRICT_CODE ?? "",
    QPAY_TAX_TYPE: process.env.QPAY_TAX_TYPE ?? "",
    QPAY_INVOICE_OPTIONS_JSON: process.env.QPAY_INVOICE_OPTIONS_JSON ?? "",
    WIRE_API_BASE: process.env.WIRE_API_BASE ?? "https://api.wire.mn",
    PAYMENT_DESCRIPTION:
      process.env.PAYMENT_DESCRIPTION ?? "mend birthday greeting",
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: "mend-prod",
      database_id: "d1a4d2ac-715b-4453-8165-04b538d406c0",
    },
  ],
  r2_buckets: [{ binding: "MEDIA", bucket_name: "mend-media" }],
};

const localBindingConfig = {
  ...workerConfig,
  vars: {
    APP_SECRET: process.env.APP_SECRET ?? "",
    ADMIN_API_SECRET: process.env.ADMIN_API_SECRET ?? "",
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? "",
    PAYMENT_PROVIDER_MODE: process.env.PAYMENT_PROVIDER_MODE ?? "qpay",
    PAYMENT_DEMO_SECRET: process.env.PAYMENT_DEMO_SECRET ?? "",
    PAYMENT_TTL_MINUTES: process.env.PAYMENT_TTL_MINUTES ?? "10",
    ACCESS_CODE_TTL_DAYS: process.env.ACCESS_CODE_TTL_DAYS ?? "30",
    QPAY_BASE_URL:
      process.env.QPAY_BASE_URL ?? "https://merchant-sandbox.qpay.mn",
    QPAY_CLIENT_ID: process.env.QPAY_CLIENT_ID ?? "",
    QPAY_CLIENT_SECRET: process.env.QPAY_CLIENT_SECRET ?? "",
    QPAY_INVOICE_CODE: process.env.QPAY_INVOICE_CODE ?? "",
    QPAY_BRANCH_CODE: process.env.QPAY_BRANCH_CODE ?? "ONLINE",
    QPAY_STAFF_CODE: process.env.QPAY_STAFF_CODE ?? "WEB",
    QPAY_TERMINAL_CODE: process.env.QPAY_TERMINAL_CODE ?? "MEND",
    QPAY_LINE_TAX_CODE: process.env.QPAY_LINE_TAX_CODE ?? "",
    QPAY_DISTRICT_CODE: process.env.QPAY_DISTRICT_CODE ?? "",
    QPAY_TAX_TYPE: process.env.QPAY_TAX_TYPE ?? "",
    QPAY_INVOICE_OPTIONS_JSON: process.env.QPAY_INVOICE_OPTIONS_JSON ?? "",
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ?? "",
    WIRE_API_BASE: process.env.WIRE_API_BASE ?? "https://api.wire.mn",
    WIRE_API_KEY: process.env.WIRE_API_KEY ?? "",
    WIRE_WEBHOOK_SECRET: process.env.WIRE_WEBHOOK_SECRET ?? "",
    WIRE_SETUP_TOKEN: process.env.WIRE_SETUP_TOKEN ?? "",
    PAYMENT_DESCRIPTION:
      process.env.PAYMENT_DESCRIPTION ?? "mend birthday greeting",
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: "mend-local",
      database_id: "mend-local",
    },
  ],
  r2_buckets: [{ binding: "MEDIA", bucket_name: "mend-media-local" }],
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        // Local development reads ignored .env files. Production builds keep
        // secrets out of the artifact: Cloudflare Workers Builds gets D1/R2
        // bindings and public vars via productionBindingConfig, while Sites
        // builds get workerConfig only and receive bindings via hosting.json.
        config:
          command === "build"
            ? isCloudflareBuild
              ? productionBindingConfig
              : workerConfig
            : localBindingConfig,
      }),
    ],
  };
});
