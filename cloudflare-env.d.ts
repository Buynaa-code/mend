declare namespace Cloudflare {
  interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_MEDIA_BUCKET?: string;
  }
}
