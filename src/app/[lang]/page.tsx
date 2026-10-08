"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { dict, type Lang } from "@/lib/i18n";
import { haversineKm } from "@/lib/delivery";
import { api, type Restaurant } from "@/lib/data";
import { use } from "react";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
// SSR stays on so the banner is in the initial HTML; it only asks the server
// for the session inside useEffect.
const AuthBanner = dynamic(() => import("@/components/AuthBanner"));

const DEFAULT_POS: [number, number] = [36.7525, 3.042]; // Alger

export default function Home({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const [shops, setShops] = useState<Restaurant[]>([]);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"all" | "restaurant" | "grocery">(
    "all"
  );
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    let cancelled = false;
    api
      .restaurants()
      .then(({ restaurants }) => {
        if (!cancelled) setShops(restaurants);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    const p = pos || DEFAULT_POS;
    return shops.map((s) => {
      const distanceKm = haversineKm(p[0], p[1], s.lat ?? p[0], s.lng ?? p[1]);
      const fee = Math.round(100 + 40 * distanceKm);
      const eta = Math.max(10, Math.round((distanceKm / 25) * 60) + 10);
      return { ...s, distanceKm, fee, eta };
    });
  }, [shops, pos]);

  const badges = useMemo(() => {
    const list = enriched;
    if (!list.length) return new Map<string, string[]>();
    const m = new Map<string, string[]>();
    const add = (id: string, b: string) =>
      m.set(id, [...(m.get(id) || []), b]);
    [...list].sort((a, b) => a.distanceKm - b.distanceKm)[0] &&
      add([...list].sort((a, b) => a.distanceKm - b.distanceKm)[0].id, "nearest");
    [...list].sort((a, b) => a.fee - b.fee)[0] &&
      add([...list].sort((a, b) => a.fee - b.fee)[0].id, "cheapest");
    [...list].sort((a, b) => a.eta - b.eta)[0] &&
      add([...list].sort((a, b) => a.eta - b.eta)[0].id, "quickest");
    return m;
  }, [enriched]);

  const shown = enriched.filter((s) => filter === "all" || s.type === filter);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold">{t.tagline}</h1>
      <AuthBanner lang={lang} />
      <img
        src="/1791131299258.jpg"
        alt=""
        style={{ width: "100%", display: "block" }}
        className="mt-4 rounded-xl"
      />

      <div className="mt-3 flex gap-2">
        {(
          [
            ["all", "🛍️"],
            ["restaurant", "🍽️"],
            ["grocery", "🥬"],
          ] as const
        ).map(([f, emoji]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm ${filter === f ? "bg-amber-600 text-white" : "bg-white border"}`}
          >
            {emoji}{" "}
            {f === "all"
              ? lang === "fr"
                ? "Tous"
                : "الكل"
              : f === "restaurant"
                ? t.restaurants
                : t.groceries}
          </button>
        ))}
        <button
          onClick={() => setView(view === "list" ? "map" : "list")}
          className="ms-auto rounded-full border bg-white px-4 py-1.5 text-sm"
        >
          {view === "list" ? `🗺️ ${t.map}` : `📋 ${t.list}`}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {t.chooseLocation} ({(pos || DEFAULT_POS)[0].toFixed(4)},{" "}
        {(pos || DEFAULT_POS)[1].toFixed(4)})
      </p>

      <div className="mt-3">
        <MapView
          center={pos || DEFAULT_POS}
          pick
          onPick={(la, ln) => setPos([la, ln])}
          points={shown
            .filter((s) => s.lat != null && s.lng != null)
            .map((s) => ({
              lat: s.lat as number,
              lng: s.lng as number,
              label: lang === "ar" ? s.name_ar : s.name_fr,
              color: s.type === "grocery" ? "#16a34a" : "#d97706",
            }))}
          height={view === "map" ? 420 : 240}
        />
      </div>

      {loadError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {view === "list" && !loadError && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
              {s.image && (
                <img
                  src={s.image}
                  alt={s.name_fr}
                  className="mb-2 h-32 w-full rounded-lg object-cover"
                />
              )}
              <div className="flex items-start justify-between">
                <Link
                  href={`/${lang}/restaurant/${s.id}`}
                  className="text-lg font-semibold text-amber-700"
                >
                  {lang === "ar" ? s.name_ar : s.name_fr}
                </Link>
                <span
                  className={`text-xs ${s.is_open ? "text-green-600" : "text-red-600"}`}
                >
                  {s.is_open ? t.open : t.closed}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {lang === "ar" ? s.category_ar : s.category_fr} · ⭐ {s.rating}
              </p>
              <p className="text-sm text-slate-600">
                {s.distanceKm.toFixed(1)} {t.km} · {t.deliveryFee}: {s.fee} DA ·{" "}
                {t.deliveries} {s.eta} {t.minutes}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(badges.get(s.id) || []).map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                  >
                    {b === "nearest"
                      ? `📍 ${t.nearest}`
                      : b === "cheapest"
                        ? `💰 ${t.cheapest}`
                        : `⚡ ${t.quickest}`}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
