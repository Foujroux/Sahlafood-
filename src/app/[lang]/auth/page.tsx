"use client";

import { useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { use, useEffect } from "react";

export default function AuthPage({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("client");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function submit() {
    setMsg("");
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) return setMsg(error.message);
      const u = data.user;
      if (u) {
        await supabase.from("profiles").upsert({
          id: u.id,
          full_name: fullName,
          phone,
          role,
          preferred_language: lang,
        });
      }
      setMsg("✅ " + (lang === "fr" ? "Compte créé !" : "تم إنشاء الحساب!"));
      setUser(u);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return setMsg(error.message);
      setUser(data.user);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const inp = "w-full rounded-lg border p-2 text-sm";

  if (user)
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-bold">{t.account}</h1>
        <p className="mt-2">{user.email}</p>
        <button onClick={logout} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white">
          {t.logout}
        </button>
      </main>
    );

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">
        {mode === "register" ? t.register : t.login}
      </h1>
      <div className="mt-3 grid gap-2">
        {mode === "register" && (
          <>
            <input className={inp} placeholder={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input className={inp} placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label className="text-sm">
              {t.role}:{" "}
              <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded border p-1">
                <option value="client">{t.client}</option>
                <option value="driver">{t.driver}</option>
                <option value="restaurateur">{lang === "fr" ? "Restaurateur" : "صاحب مطعم"}</option>
                <option value="fastfood">{lang === "fr" ? "Fast food" : "وجبات سريعة"}</option>
                <option value="pizza">{lang === "fr" ? "Pizzeria" : "بيتزا"}</option>
                <option value="grocery">{lang === "fr" ? "Épicerie" : "بقالة"}</option>
              </select>
            </label>
          </>
        )}
        <input className={inp} type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inp} type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={submit} className="rounded-lg bg-amber-600 px-4 py-2 text-white">
          {mode === "register" ? t.register : t.login}
        </button>
        <button onClick={() => setMode(mode === "register" ? "login" : "register")} className="text-sm text-amber-700 underline">
          {mode === "register" ? t.login : t.register}
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </main>
  );
}
