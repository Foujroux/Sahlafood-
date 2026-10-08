"use client";

/**
 * Thin client for Neon Auth (Better Auth).
 *
 * Replaces supabase.auth.*. Session state comes from the server: call
 * /api/me to read it, and listen for storage events so tabs stay in sync.
 * Better Auth sets its own secure cookie, so nothing token-shaped is kept in
 * localStorage here.
 */

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
};

export type AuthResponse = {
  user: AuthUser | null;
  error: string | null;
  /** HTTP status, so callers can distinguish a rate limit from bad input. */
  status: number;
};

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_NEON_AUTH_URL is not set");
  }
  return url.replace(/\/$/, "");
}

async function parse(res: Response): Promise<AuthResponse> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON error page; fall through to a generic message.
  }

  if (!res.ok) {
    const message =
      (body.message as string | undefined) ||
      (body.error as string | undefined) ||
      `Request failed (${res.status})`;
    return { user: null, error: message, status: res.status };
  }

  const user = (body.user as AuthUser | undefined) ?? null;
  return { user, error: null, status: res.status };
}

export const neonAuth = {
  /** Current session, resolved server-side from the verified cookie. */
  async getSession(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return { user: null, error: null };
      const data = (await res.json()) as { user: AuthUser | null };
      return { user: data.user, error: null };
    } catch {
      return { user: null, error: null };
    }
  },

  async signUpEmail(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    const res = await fetch(`${baseUrl()}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    return parse(res);
  },

  async signInEmail(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${baseUrl()}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return parse(res);
  },

  /**
   * Starts the OAuth handshake by asking the server for an absolute URL.
   * Redirecting from the browser directly fails because Better Auth requires a
   * matching Origin header, which a server-side redirect supplies.
   */
  async signInSocial(provider: "google" | "facebook"): Promise<AuthResponse> {
    const res = await fetch(`/api/auth/social?provider=${provider}`, {
      method: "POST",
    });
    if (!res.ok) {
      const { error, status } = await parse(res);
      return { user: null, error, status };
    }
    const { url } = (await res.json()) as { url: string };
    window.location.assign(url);
    // Navigation is in flight; nothing useful to return.
    return { user: null, error: null, status: res.status };
  },

  async signOut(): Promise<void> {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
  },
};

/**
 * Subscribe to session changes. Cross-tab sign-in/sign-out fires a storage
 * event, which we use to re-read the session so the UI doesn't go stale.
 */
export function onAuthChange(handler: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith("better-auth")) handler();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}