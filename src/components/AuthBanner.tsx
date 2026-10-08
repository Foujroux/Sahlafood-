"use client";

import Link from "next/link";
import { dict, type Lang } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";

// Full-width auth call to action under the home tagline. Reads as "Connexion"
// until a session exists, then becomes "Mon compte".
export default function AuthBanner({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const { user, loading } = useSession();

  // Hold back until the session lookup settles, otherwise a signed-in
  // customer sees a "Connexion" flash on every load.
  if (loading) {
    return (
      <div
        aria-hidden
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-green-600 py-3"
      />
    );
  }

  return (
    <Link
      href={user ? `/${lang}/compte` : `/${lang}/auth`}
      className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-green-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-green-700"
    >
      {user ? t.account : t.login}
    </Link>
  );
}