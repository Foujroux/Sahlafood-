"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { dict, roleLabel, ROLES, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function AuthPage({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("client");

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Session is read from cookies (see src/middleware.ts), so this survives reloads.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!email.trim()) return setErr(t.emailRequired);
    if (!password) return setErr(t.passwordRequired);

    if (mode === "register") {
      if (!fullName.trim()) return setErr(t.nameRequired);
      if (password.length < 6) return setErr(t.passwordTooShort);

      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Read by the public.handle_new_user() DB trigger to build the profile,
          // so we don't depend on a client-side insert that RLS could reject.
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
            preferred_language: lang,
          },
        },
      });
      setBusy(false);

      if (error) {
        setErr(/already registered|already been registered/i.test(error.message)
          ? (lang === "fr" ? "Cet e-mail est déjà inscrit. Connectez-vous." : "هذا البريد مسجل مسبقاً. سجّل الدخول.")
          : error.message);
        return;
      }

      if (data.session) {
        // No email confirmation required: we are already logged in.
        router.push(`/${lang}/compte`);
        router.refresh();
        return;
      }

      // Email confirmation required: there is no session yet, so tell the user
      // to confirm instead of pretending they are signed in.
      setMode("login");
      setMsg(t.confirmEmailSent);
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      setErr(
        /invalid login credentials/i.test(error.message)
          ? t.invalidCredentials
          : error.message
      );
      return;
    }

    if (!data.session) return setErr(t.emailNotConfirmed);

    router.push(`/${lang}/compte`);
    router.refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push(`/${lang}`);
    router.refresh();
  }

  const inp = "w-full rounded-lg border p-2 text-sm";

  if (checking) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-sm text-slate-600">{t.loading}</p>
      </main>
    );
  }

  if (user) {
    const name =
      user.user_metadata?.full_name ||
      (user.email ? user.email.split("@")[0] : "");
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-bold">{t.account}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.signedIn}</p>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-slate-600">{user.email}</p>
        <p className="mt-1 text-sm text-slate-600">
          {t.role}: {roleLabel(lang, user.user_metadata?.role ?? "client")}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/${lang}/compte`}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white"
          >
            {t.account}
          </Link>
          <button
            onClick={logout}
            className="rounded-lg border border-red-600 px-4 py-2 text-red-600"
          >
            {t.logout}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">
        {mode === "register" ? t.register : t.login}
      </h1>
      <form onSubmit={submit} className="mt-3 grid gap-2">
        {mode === "register" && (
          <>
            <input
              className={inp}
              placeholder={t.fullName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
            <input
              className={inp}
              placeholder={t.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            <label className="text-sm">
              {t.role}:{" "}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded border p-1"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(lang, r)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <input
          className={inp}
          type="email"
          required
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className={inp}
          type="password"
          required
          placeholder={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy
            ? mode === "register"
              ? t.register
              : t.signingIn
            : mode === "register"
              ? t.register
              : t.login}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setMsg("");
            setErr("");
          }}
          className="text-sm text-amber-700 underline"
        >
          {mode === "register" ? t.login : t.register}
        </button>
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </main>
  );
}