type AppBindings = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  APP_SECRET?: string;
  ADMIN_API_SECRET?: string;
  PUBLIC_APP_URL?: string;
  PAYMENT_PROVIDER_MODE?: string;
  PAYMENT_DEMO_SECRET?: string;
  PAYMENT_TTL_MINUTES?: string;
  ACCESS_CODE_TTL_DAYS?: string;
  QPAY_BASE_URL?: string;
  QPAY_CLIENT_ID?: string;
  QPAY_CLIENT_SECRET?: string;
  QPAY_INVOICE_CODE?: string;
  QPAY_BRANCH_CODE?: string;
  QPAY_STAFF_CODE?: string;
  QPAY_TERMINAL_CODE?: string;
  QPAY_LINE_TAX_CODE?: string;
  QPAY_DISTRICT_CODE?: string;
  QPAY_TAX_TYPE?: string;
  QPAY_INVOICE_OPTIONS_JSON?: string;
};

let bindingsPromise: Promise<AppBindings> | null = null;
let schemaPromise: Promise<void> | null = null;

export async function getAppBindings() {
  bindingsPromise ??= import("cloudflare:workers").then(
    ({ env }) => env as unknown as AppBindings,
  );
  return bindingsPromise;
}

export async function getDb() {
  const bindings = await getAppBindings();
  if (!bindings.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return bindings.DB;
}

export async function getMediaBucket() {
  const bindings = await getAppBindings();
  if (!bindings.MEDIA) {
    throw new Error("Cloudflare R2 binding `MEDIA` is unavailable.");
  }
  return bindings.MEDIA;
}

export function ensureSchema() {
  schemaPromise ??= initializeSchema();
  return schemaPromise;
}

async function initializeSchema() {
  const db = await getDb();
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS greetings (
        id TEXT PRIMARY KEY,
        owner_token_hash TEXT NOT NULL UNIQUE,
        public_slug TEXT NOT NULL UNIQUE,
        recipient_name TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        template TEXT NOT NULL,
        headline TEXT NOT NULL,
        message TEXT NOT NULL,
        surprise_message TEXT NOT NULL,
        music_url TEXT NOT NULL,
        music_name TEXT NOT NULL,
        photos_json TEXT NOT NULL,
        birthday_date TEXT NOT NULL,
        opened_at TEXT,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        greeting_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (greeting_id) REFERENCES greetings(id) ON DELETE CASCADE
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS responses_greeting_id_idx ON responses(greeting_id)",
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        content_json TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL UNIQUE,
        draft_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_invoice_id TEXT UNIQUE,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        client_secret_hash TEXT NOT NULL,
        qr_text TEXT NOT NULL,
        qr_image TEXT NOT NULL,
        short_url TEXT NOT NULL,
        deeplinks_json TEXT NOT NULL,
        failure_reason TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        succeeded_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE RESTRICT
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS payments_draft_id_idx ON payments(draft_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)",
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS access_codes (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        expires_at TEXT,
        used_at TEXT,
        greeting_id TEXT,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS access_codes_status_idx ON access_codes(status)",
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS greeting_private (
        greeting_id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        owner_token_hash TEXT NOT NULL UNIQUE,
        payment_id TEXT NOT NULL UNIQUE,
        internal_notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (greeting_id) REFERENCES greetings(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        processed_at TEXT,
        UNIQUE (provider, event_id)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        email TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sent_at TEXT
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS notifications_status_idx ON notifications(status)",
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `),
  ]);

  const columns = await db
    .prepare("PRAGMA table_info(greetings)")
    .all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "access_code_id")) {
    try {
      await db
        .prepare("ALTER TABLE greetings ADD COLUMN access_code_id TEXT")
        .run();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      if (!/duplicate column/i.test(message)) throw caught;
    }
  }
  await db
    .prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS greetings_access_code_id_unique ON greetings(access_code_id)",
    )
    .run();
}
