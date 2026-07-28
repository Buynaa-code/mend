import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./schema";

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is unavailable. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  adminClient ??= createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}

export function getMediaBucket() {
  return process.env.SUPABASE_MEDIA_BUCKET?.trim() || "greetings";
}
