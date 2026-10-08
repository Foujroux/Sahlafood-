import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTH_BASE = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");

/** Signs the user out by clearing the Neon Auth session cookie. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  if (AUTH_BASE) {
    await fetch(`${AUTH_BASE}/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
    }).catch(() => {
      // Best effort: the client clears its own view of the session either way,
      // and a failure here shouldn't block the redirect.
    });
  }

  return NextResponse.redirect(`${origin}/fr`, { status: 303 });
}