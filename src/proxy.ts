import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";

export async function proxy(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // Don't hard-fail every route when Supabase isn't configured.
    return undefined;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets and image files, so the auth
     * session is refreshed on navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};