"use client";

import { useCallback, useEffect, useState } from "react";
import { neonAuth, onAuthChange, type AuthUser } from "@/lib/auth-client";

/**
 * Current session, read from the server.
 *
 * There is no client-side token: Neon Auth holds the session in an httpOnly
 * cookie, so the only way to know who is signed in is to ask /api/me, which
 * verifies that cookie against the project's JWKS.
 */
export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { user: next } = await neonAuth.getSession();
    setUser(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return onAuthChange(refresh);
  }, [refresh]);

  const signOut = useCallback(async () => {
    await neonAuth.signOut();
    // A full reload clears every server-rendered view of the old session.
    window.location.assign("/fr");
  }, []);

  return { user, loading, refresh, signOut };
}