"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict, LANGS, type Lang } from "@/lib/i18n";

export default function Nav({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(fr|ar)/, "");
  const t = dict[lang];
  return (
    <header className="bg-amber-600 text-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 p-3">
        <Link href={`/${lang}`} className="text-lg font-bold sm:text-xl">
          {t.appName}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <Link href={`/${lang}`}>{t.home}</Link>
          <Link href={`/${lang}/commander`}>{t.cart}</Link>
          <Link href={`/${lang}/auth`}>{t.login}</Link>
          <Link href={`/${lang}/compte`}>{t.account}</Link>
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
