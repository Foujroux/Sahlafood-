"use client";

import { useEffect, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { use } from "react";

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
      }
    });
  }, []);

  async function save() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ ...p, id: user.id });
    setMsg(error ? error.message : "✅");
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
          {t.role}:{" "}
          {p.role === "driver"
            ? t.driver
            : p.role === "restaurateur"
              ? lang === "fr" ? "Restaurateur" : "صاحب مطعم"
              : p.role === "fastfood"
                ? "Fast food"
                : p.role === "pizza"
                  ? lang === "fr" ? "Pizzeria" : "بيتزا"
                  : p.role === "grocery"
                    ? lang === "fr" ? "Épicerie" : "بقالة"
                    : t.client}
        </label>
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
        <button onClick={save} className="rounded-lg bg-amber-600 px-4 py-2 text-white">
          {t.save}
        </button>
        {msg && <p>{msg}</p>}
      </div>
    </main>
  );
}
