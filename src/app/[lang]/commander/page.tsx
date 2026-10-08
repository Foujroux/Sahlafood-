"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { dict, type Lang } from "@/lib/i18n";
import { api, clearCart, readCart, type CartLine, type Restaurant } from "@/lib/data";
import { deliveryOptions, haversineKm } from "@/lib/delivery";
import { useSession } from "@/hooks/useSession";
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
  const { user, loading } = useSession();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shop, setShop] = useState<Restaurant | null>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [vehicle, setVehicle] = useState<"bike" | "car" | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const c = readCart();
    setCart(c);
    if (c.length > 0) {
      api
        .restaurant(c[0].shopId)
        .then((data) => setShop(data.shop))
        .catch(() => setShop(null));
    }
  }, []);

  const p = pos || DEFAULT_POS;
  const distance =
    shop?.lat != null && shop?.lng != null
      ? haversineKm(shop.lat, shop.lng, p[0], p[1])
      : 0;
  const options = useMemo(() => deliveryOptions(distance), [distance]);
  const subtotal = cart.reduce((s, i) => s + Number(i.price), 0);
  const chosen = options.find((o) => o.vehicle === vehicle);

  async function place() {
    if (!user) return setMsg(t.needLogin);
    if (!vehicle) return setMsg(t.chooseDelivery);
    if (!shop) return setMsg(t.needLogin);

    try {
      // user_id is applied server-side from the session; it is never sent from
      // the browser, so an order can't be filed under someone else's account.
      await api.createOrder({
        restaurant_id: shop.id,
        items: cart,
        delivery_vehicle: vehicle,
        delivery_fee: chosen?.fee || 0,
        total: subtotal + (chosen?.fee || 0),
        address: `${p[0].toFixed(5)}, ${p[1].toFixed(5)}`,
        lat: p[0],
        lng: p[1],
        payment_method: "cash_on_delivery",
      });
      clearCart();
      setCart([]);
      setMsg("✅ " + t.orderPlaced);
    } catch (err) {
      setMsg((err as Error).message);
    }
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
            center={shop?.lat != null && shop?.lng != null ? [shop.lat, shop.lng] : DEFAULT_POS}
            pick
            onPick={(la, ln) => setPos([la, ln])}
            points={
              shop?.lat != null && shop?.lng != null
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
          {!user && !loading && (
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
