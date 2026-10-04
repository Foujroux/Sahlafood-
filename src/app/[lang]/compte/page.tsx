"use client";

import { useEffect, useState } from "react";
import { dict, roleLabel, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { use } from "react";

const VENDOR_ROLES = ["restaurateur", "fastfood", "pizza", "grocery"];

export default function ComptePage({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const [user, setUser] = useState<any>(null);
  const [p, setP] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [shop, setShop] = useState<any | null>(null);
  const [shopLoaded, setShopLoaded] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name_fr: "", name_ar: "", price: "", image: "" });
  const [shopMsg, setShopMsg] = useState("");

  const isVendor = VENDOR_ROLES.includes(p.role);
  const isDriver = p.role === "driver";

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        setP(prof || {});
        const { data: shops } = await supabase
          .from("restaurants")
          .select("*")
          .eq("owner_id", data.user.id)
          .limit(1);
        if (shops && shops.length) {
          setShop(shops[0]);
          const { data: its } = await supabase
            .from("menu_items")
            .select("*")
            .eq("restaurant_id", shops[0].id);
          setItems(its || []);
        }
        setShopLoaded(true);
      }
    });
  }, []);

  async function save() {
    if (!user) return;
    if (isVendor && (!p.wilaya || !p.commune || !p.address))
      return setMsg(
        lang === "fr"
          ? "Adresse complète (wilaya, commune, adresse) obligatoire pour les vendeurs."
          : "العنوان الكامل إجباري لأصحاب المتاجر."
      );
    const { error } = await supabase
      .from("profiles")
      .upsert({ ...p, id: user.id });
    setMsg(error ? error.message : "✅");
  }

  async function saveShop() {
    if (!user || !shop) return;
    const payload = {
      ...shop,
      owner_id: user.id,
      type: p.role === "grocery" ? "grocery" : "restaurant",
    };
    const { data, error } = shop.id
      ? await supabase.from("restaurants").update(payload).eq("id", shop.id).select().single()
      : await supabase.from("restaurants").insert(payload).select().single();
    if (!error && data) setShop(data);
    setShopMsg(error ? error.message : "✅");
  }

  async function createShop() {
    setShop({
      name_fr: p.full_name ? `${p.full_name}` : "",
      name_ar: "",
      phone: p.phone || "",
      wilaya: p.wilaya || "",
      commune: p.commune || "",
      address: p.address || "",
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
    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: shop.id,
        name_fr: newItem.name_fr,
        name_ar: newItem.name_ar || newItem.name_fr,
        price: Number(newItem.price),
        image: newItem.image || null,
      })
      .select()
      .single();
    if (!error && data) setItems([...items, data]);
    setShopMsg(error ? error.message : "✅");
    setNewItem({ name_fr: "", name_ar: "", price: "", image: "" });
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) setItems(items.filter((i) => i.id !== id));
  }

  if (!user)
    return (
      <main className="p-4">
        <p>{t.needLogin}</p>
      </main>
    );

  const inp = "w-full rounded-lg border p-2 text-sm";
  const f = (k: string, label: string, type = "text") => (
    <input
      className={inp}
      type={type}
      placeholder={label}
      value={p[k] ?? ""}
      onChange={(e) => setP({ ...p, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
    />
  );
  const s = (k: string, placeholder: string, type = "text") => (
    <input
      className={inp}
      type={type}
      placeholder={placeholder}
      value={shop?.[k] ?? ""}
      onChange={(e) => setShop({ ...shop, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
    />
  );

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">{t.account}</h1>
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
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={!!shop.is_open}
                  onChange={(e) => setShop({ ...shop, is_open: e.target.checked })}
                />{" "}
                {shop.is_open ? t.open : t.closed}
              </label>
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
