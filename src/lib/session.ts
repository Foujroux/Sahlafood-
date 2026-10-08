import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";

/**
 * Session verification for Neon Auth.
 *
 * Neon Auth issues a signed JWT stored in a cookie. We verify it against the
 * project's remote JWKS before trusting any claim, and return only the user id.
 * RLS in Postgres is then driven by that id via set_config.
 *
 * The id from a verified token is the ONLY accepted source of identity in this
 * app. A user id arriving from a request body or query string must never be
 * used to set the RLS context.
 */

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function jwksUrl(): string {
  const explicit = process.env.NEON_AUTH_JWKS_URL;
  if (explicit) return explicit;

  const base = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "NEON_AUTH_JWKS_URL is not set. Point it at the Neon Auth JWKS endpoint."
    );
  }
  return `${base}/.well-known/jwks.json`;
}

// Cached across requests; the key set rotates rarely and jose handles caching.
function keySet() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(jwksUrl()));
  return jwks;
}

// Better Auth names the session cookie this. We read all sf_* candidates so a
// project using a different prefix still works.
const COOKIE_NAMES = [
  "neon_auth.session_token",
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export type Session = {
  userId: string;
  email: string | null;
};

export async function getSession(): Promise<Session | null> {
  const store = await cookies();

  const token =
    COOKIE_NAMES.map((n) => store.get(n)?.value).find(Boolean) ??
    // Fall back to any neon_auth cookie we recognise.
    store
      .getAll()
      .map((c) => c.value)
      .find((v) => v && v.split(".").length === 3);

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, keySet(), {
      // Pin the algorithm so a token cannot force "none" or an HMAC using the
      // public key as the secret. Neon Auth signs with Ed25519 by default;
      // the asymmetric options are kept so a project rotated to them still
      // verifies.
      algorithms: ["EdDSA", "RS256", "ES256"],
    });

    const userId =
      (payload.sub as string | undefined) ??
      ((payload.user as { id?: string } | undefined)?.id);

    if (!userId) return null;

    return {
      userId,
      email: (payload.email as string | undefined) ?? null,
    };
  } catch {
    // Expired or tampered token: treat as signed out rather than surfacing an
    // error to the page.
    return null;
  }
}

/** Convenience for route handlers that want the id or null. */
export async function getUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}