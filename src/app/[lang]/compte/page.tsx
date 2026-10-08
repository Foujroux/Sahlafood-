"use client";

import { useEffect, useState } from "react";
import { dict, roleLabel, type Lang } from "@/lib/i18n";
import {
  api,
  type MenuItem,
  type Profile,
  type Restaurant,
} from "@/lib/data";
import { useSession } from "@/hooks/useSession";
import { use } from "react";

const VENDOR_ROLES = ["restaurateur", "fastfood", "pizza", "grocery"];

type ShopDraft = Partial<Restaurant> & { id?: string };

export default function ComptePage({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const { user, loading, signOut } = useSession();

  const [p, setP] = useState<Partial<Profile>>({});
  const [msg, setMsg] = useState("");
  const [shop, setShop] = useState<ShopDraft | null>(null);
  const [shopLoaded, setShopLoaded] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState({ name_fr: "", name_ar: "", price: "", image: "" });
  const [shopMsg, setShopMsg] = useState("");

  const isVendor = VENDOR_ROLES.includes(p.role ?? "");
  const isDriver = p.role === "driver";

  useEffect(() => {
    if (!user) return;

    // Captured so the narrowing survives into the async closure below, where
    // TypeScript can no longer see the guard.
    const userId = user.id;
    let cancelled = false;

    async function load() {
      try {
        // First visit after signup: apply the role and phone chosen on the
        // auth form, then drop the stash. Done before the profile read so the
        // vendor and driver sections render straight away.
        const raw = sessionStorage.getItem("sf-onboarding");
        if (raw) {
          sessionStorage.removeItem("sf-onboarding");
          try {
            const onboarding = JSON.parse(raw) as {
              role?: string;
              phone?: string;
              lang?: string;
            };
            const patch: Partial<Profile> = {};
            if (onboarding.role) patch.role = onboarding.role;
            if (onboarding.phone) patch.phone = onboarding.phone;
            patch.preferred_language = onboarding.lang ?? lang;
            if (Object.keys(patch).length > 1) {
              const { profile } = await api.updateProfile(patch);
              if (!cancelled) setP(profile);
            }
          } catch {
            // Malformed stash: fall through to a plain profile read.
          }
        }

        const [{ profile }, { restaurants }] = await Promise.all([
          api.profile(),
          api.restaurants(),
        ]);
        if (cancelled) return;

        setP(profile ?? {});

        // Ownership is enforced by RLS, so filtering client-side here is just
        // presentation; a non-owner could not have written the row anyway.
        const mine = restaurants.find((r) => r.owner_id === userId);
        if (mine) {
          setShop(mine);
          const { items: its } = await api.restaurant(mine.id);
          if (!cancelled) setItems(its);
        }
      } catch (err) {
        if (!cancelled) setMsg((err as Error).message);
      } finally {
        if (!cancelled) setShopLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function save() {
    if (!user) return;

    if (isVendor && (!p.wilaya || !p.commune || !p.address)) {
      return setMsg(
        lang === "fr"
          ? "Adresse complète (wilaya, commune, adresse) obligatoire pour les vendeurs."
          : "العنوان الكامل إجباري لأصحاب المتاجر."
      );
    }

    try {
      // The id is applied server-side from the session, so no field here can
      // redirect this write to another account.
      const { profile } = await api.updateProfile(p);
      setP(profile);
      setMsg("✅");
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function saveShop() {
    if (!user || !shop) return;

    const payload = {
      name_fr: shop.name_fr ?? "",
      name_ar: shop.name_ar ?? "",
      type: p.role === "grocery" ? "grocery" : "restaurant",
      category_fr: shop.category_fr ?? "",
      category_ar: shop.category_ar ?? "",
      phone: shop.phone ?? "",
      wilaya: shop.wilaya ?? "",
      commune: shop.commune ?? "",
      address: shop.address ?? "",
      image: shop.image ?? "",
      lat: shop.lat ?? 36.7525,
      lng: shop.lng ?? 3.042,
    };

    try {
      if (shop.id) {
        await api.updateRestaurant(shop.id, payload);
        setShop((prev) => (prev ? { ...prev, ...payload } : prev));
      } else {
        const { shop: created } = await api.createRestaurant(payload);
        setShop(created);
        setShopMsg("✅");
        return;
      }
      setShopMsg("✅");
    } catch (err) {
      setShopMsg((err as Error).message);
    }
  }

  function createShop() {
    setShop({
      name_fr: p.full_name ?? "",
      name_ar: "",
      type: p.role === "grocery" ? "grocery" : "restaurant",
      phone: p.phone ?? "",
      wilaya: p.wilaya ?? "",
      commune: p.commune ?? "",
      address: p.address ?? "",
      category_fr: "",
      category_ar: "",
      rating: 5,
      is_open: true,
      avg_delivery_min: 30,
      lat: 36.7525,
      lng: 3.042,
    });
  }

  async function addItem() {
    if (!shop?.id || !newItem.name_fr || !newItem.price) return;

    try {
      const { item } = await api.createMenuItem({
        restaurant_id: shop.id,
        name_fr: newItem.name_fr,
        name_ar: newItem.name_ar || undefined,
        price: Number(newItem.price),
        image: newItem.image || null,
      });
      setItems((prev) => [...prev, item]);
      setShopMsg("✅");
      setNewItem({ name_fr: "", name_ar: "", price: "", image: "" });
    } catch (err) {
      setShopMsg((err as Error).message);
    }
  }

  async function removeItem(id: string) {
    try {
      await api.deleteMenuItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setShopMsg((err as Error).message);
    }
  }

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-sm text-slate-600">{t.loading}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-4">
        <p>{t.needLogin}</p>
        <button
          onClick={signOut}
          className="mt-3 rounded-lg border border-red-600 px-4 py-2 text-red-600"
        >
          {t.logout}
        </button>
      </main>
    );
  }

  const inp = "w-full rounded-lg border p-2 text-sm";
  const f = (k: keyof Profile, label: string, type = "text") => (
    <input
      className={inp}
      type={type}
      placeholder={label}
      value={(p[k] as string | number | null) ?? ""}
      onChange={(e) =>
        setP({
          ...p,
          [k]: type === "number" ? Number(e.target.value) : e.target.value,
        })
      }
    />
  );
  const s = (k: keyof Restaurant, placeholder: string, type = "text") => (
    <input
      className={inp}
      type={type}
      placeholder={placeholder}
      value={(shop?.[k] as string | number | null) ?? ""}
      onChange={(e) =>
        setShop({
          ...shop,
          [k]: type === "number" ? Number(e.target.value) : e.target.value,
        } as ShopDraft)
      }
    />
  );

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">{t.account}</h1>
      <p className="mt-1 break-all text-sm text-slate-600">{user.email}</p>

      <div className="mt-3 grid gap-2">
        {f("full_name", t.fullName)}
        {f("phone", t.phone)}
        {f("wilaya", t.wilaya)}
        {f("commune", t.commune)}
        {f("address", t.address)}
        <label className="text-sm">
          {t.role}: {roleLabel(lang, p.role ?? "client")}
        </label>

        {isDriver && (
          <>
            <h2 className="mt-3 font-semibold">{t.vehicleDetails}</h2>
            <label className="text-sm">
              {t.vehicleType}:{" "}
              <select
                value={p.vehicle_type || ""}
                onChange={(e) => setP({ ...p, vehicle_type: e.target.value })}
                className="rounded border p-1"
              >
                <option value="">—</option>
                <option value="bike">{t.motorbike}</option>
                <option value="car">{t.car}</option>
              </select>
            </label>
            {f("vehicle_brand", t.brand)}
            {f("vehicle_model", t.model)}
            {f("vehicle_plate", t.plate)}
            {f("vehicle_year", t.year, "number")}
            {f("vehicle_color", t.color)}
          </>
        )}

        <button onClick={save} className="rounded-lg bg-amber-600 px-4 py-2 text-white">
          {t.save}
        </button>
        {msg && <p>{msg}</p>}

        <button
          onClick={signOut}
          className="rounded-lg border border-red-600 px-4 py-2 text-red-600"
        >
          {t.logout}
        </button>
      </div>

      {isVendor && shopLoaded && (
        <section className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">
            {lang === "fr" ? "🏪 Ma boutique & carte" : "🏪 متجري وقائمتي"}
          </h2>
          {!shop ? (
            <button onClick={createShop} className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-white">
              {lang === "fr" ? "Créer ma boutique" : "أنشئ متجري"}
            </button>
          ) : (
            <div className="mt-3 grid gap-2">
              {s("name_fr", lang === "fr" ? "Nom (FR)" : "الاسم (فرنسي)")}
              {s("name_ar", lang === "fr" ? "Nom (AR)" : "الاسم (عربي)")}
              {s("category_fr", lang === "fr" ? "Catégorie (FR)" : "الفئة")}
              {s("category_ar", lang === "fr" ? "Catégorie (AR)" : "الفئة عربي")}
              {s("phone", t.phone)}
              {s("wilaya", t.wilaya)}
              {s("commune", t.commune)}
              {s("address", t.address)}
              {s("image", lang === "fr" ? "URL photo" : "رابط الصورة")}
              <button onClick={saveShop} className="rounded-lg bg-amber-600 px-4 py-2 text-white">
                {t.save}
              </button>
              {shopMsg && <p>{shopMsg}</p>}

              {shop.id && (
                <>
                  <h3 className="mt-3 font-semibold">
                    {lang === "fr" ? "Produits / Menu" : "المنتجات / القائمة"}
                  </h3>
                  <ul className="divide-y">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between py-1 text-sm">
                        <span>
                          {lang === "ar" ? it.name_ar : it.name_fr} — {it.price} DA
                        </span>
                        <button onClick={() => removeItem(it.id)} className="text-red-600">
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} placeholder="Nom FR" value={newItem.name_fr} onChange={(e) => setNewItem({ ...newItem, name_fr: e.target.value })} />
                    <input className={inp} placeholder="الاسم عربي" value={newItem.name_ar} onChange={(e) => setNewItem({ ...newItem, name_ar: e.target.value })} />
                    <input className={inp} type="number" placeholder="Prix DA" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
                    <input className={inp} placeholder="URL photo" value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })} />
                  </div>
                  <button onClick={addItem} className="rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white">
                    + {lang === "fr" ? "Ajouter un produit" : "أضف منتجاً"}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}