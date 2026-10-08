import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return { url, key };
}

// Single browser client. @supabase/ssr mirrors the session into cookies, so it
// survives reloads and stays readable from Server Components / Route Handlers.
const { url, key } = getSupabaseEnv();

export const supabase = createBrowserClient(url, key);