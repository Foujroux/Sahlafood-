"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { dict, type Lang } from "@/lib/i18n";
import { api, readCart, writeCart, type CartLine, type MenuItem, type Restaurant } from "@/lib/data";
import { useSession } from "@/hooks/useSession";

export default function RestaurantPage({
  params,
}: {
  params: Promise<{ lang: Lang; id: string }>;
}) {
  const { lang, id } = use(params);
  const t = dict[lang];
  const { user } = useSession();

  const [shop, setShop] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [adPhoto, setAdPhoto] = useState("");
  const [newItem, setNewItem] = useState({
    name_fr: "",
    name_ar: "",
    price: "",
    image: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .restaurant(id)
      .then((data) => {
        if (cancelled) return;
        setShop(data.shop);
        setItems(data.items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    setCart(readCart());
    return () => {
      cancelled = true;
    };
  }, [id]);

  function add(item: MenuItem) {
    const next = [
      ...cart,
      { ...item, shopId: id, shopName: shop?.name_fr ?? "" },
    ];
    setCart(next);
    writeCart(next);
  }

  async function setShopPhoto() {
    if (!adPhoto) return;
    try {
      await api.updateRestaurant(id, { image: adPhoto });
      setShop((prev) => (prev ? { ...prev, image: adPhoto } : prev));
      setMsg("✅");
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function addAdItem() {
    if (!newItem.name_fr || !newItem.price) return;
    try {
      const { item } = await api.createMenuItem({
        restaurant_id: id,
        name_fr: newItem.name_fr,
        name_ar: newItem.name_ar || undefined,
        price: Number(newItem.price),
        image: newItem.image || null,
      });
      setItems((prev) => [...prev, item]);
      setMsg("✅");
      setNewItem({ name_fr: "", name_ar: "", price: "", image: "" });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!shop) return <main className="p-4">…</main>;

  const inp = "w-full rounded-lg border p-2 text-sm";

  return (
    <main className="mx-auto max-w-2xl p-4">
      {shop.image && (
        <img
          src={shop.image}
          alt={shop.name_fr}
          className="h-48 w-full rounded-xl object-cover"
        />
      )}
      <h1 className="mt-3 text-2xl font-bold">
        {lang === "ar" ? shop.name_ar : shop.name_fr}
      </h1>
      <p className="text-sm text-slate-500">
        {lang === "ar" ? shop.category_ar : shop.category_fr} · ⭐ {shop.rating}
      </p>
      <ul className="mt-4 divide-y rounded-xl border bg-white">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              {it.image && (
                <img
                  src={it.image}
                  alt={it.name_fr}
                  className="h-14 w-14 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-medium">
                  {lang === "ar" ? it.name_ar : it.name_fr}
                </p>
                <p className="text-sm text-slate-500">{it.price} DA</p>
              </div>
            </div>
            <button
              onClick={() => add(it)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white"
            >
              + {t.addToCart}
            </button>
          </li>
        ))}
      </ul>

      {user && shop.owner_id === user.id && (
        <section className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">
            {lang === "fr" ? "📸 Publicité & photos du menu" : "📸 إعلانات وصور القائمة"}
          </h2>
          <div className="mt-3 flex gap-2">
            <input
              className={inp}
              placeholder={lang === "fr" ? "URL photo de la boutique" : "رابط صورة المتجر"}
              value={adPhoto}
              onChange={(e) => setAdPhoto(e.target.value)}
            />
            <button onClick={setShopPhoto} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white">
              OK
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input className={inp} placeholder="Nom FR" value={newItem.name_fr} onChange={(e) => setNewItem({ ...newItem, name_fr: e.target.value })} />
            <input className={inp} placeholder="الاسم عربي" value={newItem.name_ar} onChange={(e) => setNewItem({ ...newItem, name_ar: e.target.value })} />
            <input className={inp} placeholder="Prix DA" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
            <input className={inp} placeholder="URL photo" value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })} />
          </div>
          <button onClick={addAdItem} className="mt-2 rounded-lg bg-amber-600 px-4 py-1.5 text-sm text-white">
            + {lang === "fr" ? "Ajouter avec photo" : "أضف مع صورة"}
          </button>
          {msg && <p className="mt-1 text-sm">{msg}</p>}
        </section>
      )}

      {cart.length > 0 && (
        <Link
          href={`/${lang}/commander`}
          className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          {t.cart} ({cart.length})
        </Link>
      )}
    </main>
  );
}