"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { deliveryOptions, haversineKm } from "@/lib/delivery";
import { use } from "react";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const DEFAULT_POS: [number, number] = [36.7525, 3.042];

export default function CommanderPage({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const [user, setUser] = useState<any>(undefined);
  const [cart, setCart] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [vehicle, setVehicle] = useState<"bike" | "car" | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    try {
      const c = JSON.parse(localStorage.getItem("sahlafood-cart") || "[]");
      setCart(c);
      if (c.length > 0) {
        supabase
          .from("restaurants")
          .select("*")
          .eq("id", c[0].shopId)
          .single()
          .then(({ data }) => setShop(data));
      }
    } catch {}
  }, []);

  const p = pos || DEFAULT_POS;
  const distance = shop ? haversineKm(shop.lat, shop.lng, p[0], p[1]) : 0;
  const options = useMemo(() => deliveryOptions(distance), [distance]);
  const subtotal = cart.reduce((s, i) => s + Number(i.price), 0);
  const chosen = options.find((o) => o.vehicle === vehicle);

  async function place() {
    if (!user) return setMsg(t.needLogin);
    if (!vehicle) return setMsg(t.chooseDelivery);
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      restaurant_id: shop?.id,
      items: cart,
      delivery_vehicle: vehicle,
      delivery_fee: chosen?.fee || 0,
      total: subtotal + (chosen?.fee || 0),
      address: `${p[0].toFixed(5)}, ${p[1].toFixed(5)}`,
      lat: p[0],
      lng: p[1],
      payment_method: "cash_on_delivery",
    });
    if (error) return setMsg(error.message);
    localStorage.removeItem("sahlafood-cart");
    setCart([]);
    setMsg("✅ " + t.orderPlaced);
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">{t.checkout}</h1>

      {cart.length === 0 ? (
        <p className="mt-3 text-slate-500">{msg || t.emptyCart}</p>
      ) : (
        <>
          <ul className="mt-3 divide-y rounded-xl border bg-white">
            {cart.map((i, idx) => (
              <li key={idx} className="flex justify-between p-3">
                <span>{lang === "ar" ? i.name_ar : i.name_fr}</span>
                <span>{i.price} DA</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">{t.total}: {subtotal} DA</p>

          <h2 className="mt-4 font-semibold">{t.chooseLocation}</h2>
          <MapView
            center={shop ? [shop.lat, shop.lng] : DEFAULT_POS}
            pick
            onPick={(la, ln) => setPos([la, ln])}
            points={
              shop
                ? [{ lat: shop.lat, lng: shop.lng, label: shop.name_fr }]
                : []
            }
            height={280}
          />

          <h2 className="mt-4 font-semibold">{t.chooseDelivery}</h2>
          <ul className="mt-2 grid gap-2">
            {options.map((o) => (
              <li key={o.vehicle}>
                <button
                  onClick={() => setVehicle(o.vehicle)}
                  className={`w-full rounded-xl border p-3 text-start ${vehicle === o.vehicle ? "border-amber-600 bg-amber-50" : "bg-white"}`}
                >
                  <span className="font-semibold">
                    {o.vehicle === "bike" ? `🏍️ ${t.motorbike}` : `🚗 ${t.car}`}
                  </span>{" "}
                  — {o.fee} DA · {o.etaMin} {t.minutes} · {o.distanceKm} {t.km}
                  <div className="mt-1 flex gap-1">
                    {o.badges.map((b) => (
                      <span key={b} className="rounded-full bg-amber-100 px-2 text-xs text-amber-800">
                        {b === "cheapest"
                          ? `💰 ${t.cheapest}`
                          : b === "quickest"
                            ? `⚡ ${t.quickest}`
                            : `📍 ${t.nearest}`}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-sm">💵 {t.payOnDelivery}</p>
          {!user && user !== undefined && (
            <p className="mt-1 text-sm text-red-600">{t.needLogin}</p>
          )}
          <button
            onClick={place}
            className="mt-3 rounded-lg bg-amber-600 px-5 py-2.5 text-white"
          >
            {t.placeOrder}
          </button>
          {msg && <p className="mt-2">{msg}</p>}
        </>
      )}
    </main>
  );
}
