import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase auth session on every matched request and copies the
 * (possibly renewed) auth cookies onto the outgoing response. Without this the
 * access token expires silently and the user gets logged out.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: {
            name: string;
            value: string;
            options: CookieOptions;
          }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Validates the session and triggers a token refresh when one is due.
  await supabase.auth.getClaims();

  return response;
}