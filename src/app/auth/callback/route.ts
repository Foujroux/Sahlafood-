import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withUser } from "@/lib/db";

export const dynamic = "force-dynamic";

const FALLBACK_LANG = "fr";

function isLang(v: string | undefined): v is "fr" | "ar" {
  return v === "fr" || v === "ar";
}

/**
 * Ensures a profile row exists for the signed-in user, then sends them to their
 * account page.
 *
 * Neon Auth has no signup trigger equivalent to Supabase's handle_new_user(),
 * so the profile is created here instead. Idempotent, and RLS allows a user to
 * write only their own row.
 *
 * Kept as a route because OAuth redirects land here; sign-up and sign-in from
 * the auth form apply the profile themselves and go straight to /compte.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const cookieLang = request.cookies.get("sf_lang")?.value;
  const lang = isLang(cookieLang) ? cookieLang : FALLBACK_LANG;

  const session = await getSession();

  if (!session) {
    const back = new URL(`/${lang}/auth`, origin);
    back.searchParams.set("error", "signin_failed");
    return NextResponse.redirect(back);
  }

  try {
    await withUser(session.userId, async (client) => {
      await client.query(
        `insert into public.profiles (id, full_name, role, preferred_language)
         values ($1, $2, 'client', $3)
         on conflict (id) do nothing`,
        [session.userId, session.email ?? "", lang]
      );
    });
  } catch {
    // A missing profile shouldn't block sign-in; the account page repairs it.
  }

  return NextResponse.redirect(`${origin}/${lang}/compte`);
}