"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { dict, LANGS, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function Nav({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const router = useRouter();
  const rest = pathname.replace(/^\/(fr|ar)/, "");
  const t = dict[lang];
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push(`/${lang}`);
    router.refresh();
  }

  return (
    <header className="bg-amber-600 text-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 p-3">
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2 text-lg font-bold sm:text-xl"
        >
          <img
            src="/logo.png"
            alt="SahlaFood Logo"
            style={{ width: 32, height: 32, borderRadius: 8 }}
          />
          {t.appName}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <Link href={`/${lang}`}>{t.home}</Link>
          <Link href={`/${lang}/commander`}>{t.cart}</Link>
          {user ? (
            <>
              <Link href={`/${lang}/compte`}>{t.account}</Link>
              <button
                onClick={logout}
                className="underline underline-offset-2"
              >
                {t.logout}
              </button>
            </>
          ) : (
            <Link href={`/${lang}/auth`}>{t.login}</Link>
          )}
          <span className="flex items-center gap-1 rounded-full bg-amber-700/40 p-0.5">
            {LANGS.map((l) => (
              <Link
                key={l}
                href={`/${l}${rest}`}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold leading-none transition ${
                  l === lang
                    ? "bg-white text-amber-700 shadow"
                    : "text-white/90 hover:bg-amber-700/50"
                }`}
              >
                {l === "fr" ? "FR" : "عربي"}
              </Link>
            ))}
          </span>
        </nav>
      </div>
    </header>
  );
}