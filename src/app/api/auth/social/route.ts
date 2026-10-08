import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const AUTH_BASE = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
const VALID_PROVIDERS = new Set(["google", "facebook"]);

/**
 * Starts an OAuth login by asking Neon Auth for the redirect URL.
 *
 * The request must come from the server: Better Auth rejects a sign-in attempt
 * whose Origin doesn't match the trusted domain, and it needs the absolute
 * callback URL to be one it recognises.
 */
export async function POST(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  const lang = request.nextUrl.searchParams.get("lang");

  if (!provider || !VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ message: "Unsupported provider" }, { status: 400 });
  }

  if (!AUTH_BASE) {
    return NextResponse.json(
      { message: "NEON_AUTH_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const origin = request.nextUrl.origin;
  const callbackURL = `${origin}/auth/callback`;

  const res = await fetch(`${AUTH_BASE}/sign-in/social`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Better Auth ties the session to the Origin, so send it explicitly.
      Origin: origin,
    },
    body: JSON.stringify({ provider, callbackURL }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return NextResponse.json(
      { message: body.message ?? "Could not start sign-in" },
      { status: res.status }
    );
  }

  const { url } = (await res.json()) as { url: string };

  // Remember the language across the redirect back from the provider.
  const store = await cookies();
  store.set("sf_lang", lang ?? "fr", {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
  });

  return NextResponse.json({ url });
}