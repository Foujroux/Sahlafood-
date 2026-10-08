"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dict, roleLabel, ROLES, type Lang } from "@/lib/i18n";
import { neonAuth } from "@/lib/auth-client";
import { useSession } from "@/hooks/useSession";

export default function AuthPage({
  params,
}: {
  params: Promise<{ lang: Lang }>;
}) {
  const { lang } = use(params);
  const t = dict[lang];
  const router = useRouter();
  const { user, loading, refresh, signOut } = useSession();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("client");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Already signed in: nothing to do here.
  useEffect(() => {
    if (user) router.replace(`/${lang}/compte`);
  }, [user, lang, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!email.trim()) return setErr(t.emailRequired);
    if (!password) return setErr(t.passwordRequired);

    setBusy(true);

    try {
      if (mode === "register") {
        if (!fullName.trim()) {
          setBusy(false);
          return setErr(t.nameRequired);
        }
        if (password.length < 6) {
          setBusy(false);
          return setErr(t.passwordTooShort);
        }

        const res = await neonAuth.signUpEmail(
          email.trim(),
          password,
          fullName.trim()
        );

        if (res.error) {
          setErr(res.error);
          setBusy(false);
          return;
        }

        // Role and phone live in profiles, which the server owns. Carry them
        // through the session and let the account page apply them.
        sessionStorage.setItem(
          "sf-onboarding",
          JSON.stringify({ role, phone: phone.trim(), lang })
        );

        await refresh();
        router.push(`/${lang}/compte`);
        return;
      }

      const res = await neonAuth.signInEmail(email.trim(), password);
      if (res.error) {
        setErr(
          /invalid|credential/i.test(res.error) ? t.invalidCredentials : res.error
        );
        setBusy(false);
        return;
      }

      await refresh();
      router.push(`/${lang}/compte`);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  const inp = "w-full rounded-lg border p-2 text-sm";

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-sm text-slate-600">{t.loading}</p>
      </main>
    );
  }

  if (user) {
    const name = user.name || user.email?.split("@")[0] || "";
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-bold">{t.account}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.signedIn}</p>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-slate-600">{user.email}</p>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/${lang}/compte`}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white"
          >
            {t.account}
          </Link>
          <button
            onClick={signOut}
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