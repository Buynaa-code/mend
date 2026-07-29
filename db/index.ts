type AppBindings = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
};

let bindingsPromise: Promise<AppBindings> | null = null;
let schemaPromise: Promise<void> | null = null;

async function getBindings() {
  bindingsPromise ??= import("cloudflare:workers").then(
    ({ env }) => env as unknown as AppBindings,
  );
  return bindingsPromise;
}

export async function getDb() {
  const bindings = await getBindings();
  if (!bindings.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return bindings.DB;
}

export async function getMediaBucket() {
  const bindings = await getBindings();
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
  ]);
}
