import { type NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";

// OAuth entry point. Supabase redirects back here with ?code=..., which is
// exchanged for a session so the cookie-backed client picks it up. Then we
// forward to the account page.
//
// The language is carried through a cookie rather than the query string,
// because Supabase owns the query and would drop our parameters.
const FALLBACK_LANG = "fr";

function isLang(v: string | undefined | null): v is "fr" | "ar" {
  return v === "fr" || v === "ar";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Set by the auth page before redirecting out, so the user lands back in
  // the language they started in.
  const cookieLang = request.cookies.get("sf_lang")?.value;
  const lang = isLang(cookieLang) ? cookieLang : FALLBACK_LANG;

  if (code) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const back = new URL(`/${lang}/auth`, origin);
      back.searchParams.set("error", "oauth_callback_failed");
      return NextResponse.redirect(back);
    }
  }

  // No code and no error means someone hit the route directly; send them to
  // the sign-in page rather than a blank account page.
  const target = new URL(
    code ? `/${lang}/compte` : `/${lang}/auth`,
    origin
  );
  return NextResponse.redirect(target);
}