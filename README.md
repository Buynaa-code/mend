# torsonodor

A vinext (Cloudflare Worker) app backed by **Supabase** — Postgres for data,
Supabase Storage for uploaded media.

## Prerequisites

- Node.js `>=22.13.0`
- A Supabase project. Create one at https://supabase.com.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in Supabase creds (see below)
npm run dev
npm run build
```

## Supabase setup

1. In the Supabase dashboard, open **SQL Editor** and run
   `supabase/migrations/0001_init.sql`. This creates the `greetings`,
   `reactions`, `replies`, `admin_audit_logs` tables and the `greetings`
   Storage bucket.
2. Copy your project's URL and keys into `.env.local`:
   - `SUPABASE_URL` — `https://<project>.supabase.co`
   - `SUPABASE_ANON_KEY` — `sb_publishable_...` (browser-safe)
   - `SUPABASE_SERVICE_ROLE_KEY` — `sb_secret_...` (server-only; bypasses RLS)
   - `SUPABASE_MEDIA_BUCKET` — defaults to `greetings`
3. Server code loads these from `env` (Cloudflare Worker bindings). The dev
   server reads `.env.local` via `vite.config.ts` and injects them as Worker
   `vars` for local runs.

## Layout

- `app/` — vinext app router (RSC + route handlers)
- `app/api/greetings/route.ts` — greetings CRUD + state machine
- `app/api/media/route.ts` — image upload / stream via Supabase Storage
- `db/index.ts` — `getSupabaseAdmin()` server client + `getMediaBucket()`
- `db/schema.ts` — TypeScript row types (source of truth for shape)
- `supabase/migrations/` — SQL migrations for the Supabase project
- `worker/index.ts` — Cloudflare Worker entry point

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Supabase JS client](https://supabase.com/docs/reference/javascript/introduction)
