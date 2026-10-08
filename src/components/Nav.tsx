"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict, LANGS, type Lang } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";

// Inline SVG so the nav needs no icon dependency.
function BasketIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 9h18l-1.6 10.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z" />
      <path d="M8 9 11 3M16 9 13 3" />
      <path d="M9.5 13.5v4M14.5 13.5v4" />
    </svg>
  );
}

export default function Nav({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(fr|ar)/, "");
  const t = dict[lang];
  const { user, signOut } = useSession();

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

        {/* Cart pinned to the top-right, above the secondary nav row. */}
        <Link
          href={`/${lang}/commander`}
          aria-label={t.cart}
          className="ms-auto flex items-center gap-2 rounded-lg bg-amber-700/40 px-3 py-2 font-semibold transition hover:bg-amber-700/70 sm:order-none"
        >
          <BasketIcon />
          <span>{t.cart}</span>
        </Link>

        <nav className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <Link href={`/${lang}`}>{t.home}</Link>
          {/* Sign-in entry moved to the full-width AuthBanner on the home page;
              the nav keeps only the signed-in state. */}
          {user && (
            <>
              <Link href={`/${lang}/compte`}>{t.account}</Link>
              <button
                onClick={signOut}
                className="underline underline-offset-2"
              >
                {t.logout}
              </button>
            </>
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