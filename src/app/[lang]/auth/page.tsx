"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { dict, roleLabel, withProvider, ROLES, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type OAuthProvider = "facebook" | "google";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5 0-.7-.1-1.4-.2-2H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.4-2.6Z"
      />
      <path
        fill="#4285F4"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.4 2.6A5.9 5.9 0 0 1 12 6Z"
      />
    </svg>
  );
}

const OAUTH_PROVIDERS: {
  id: OAuthProvider;
  label: "signInWithFacebook" | "signInWithGoogle";
  Icon: () => React.JSX.Element;
}[] = [
  { id: "facebook", label: "signInWithFacebook", Icon: FacebookIcon },
  { id: "google", label: "signInWithGoogle", Icon: GoogleIcon },
];

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
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
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
        if (error.status === 429 || /rate limit/i.test(error.message)) {
          // Supabase's built-in mailer allows only a couple of emails per
          // hour project-wide, so this is expected without custom SMTP.
          setErr(/email/i.test(error.message) ? t.emailRateLimited : t.tooManyRequests);
          return;
        }
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
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        setErr(t.tooManyRequests);
        return;
      }
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

  // OAuth providers create the account on first use and sign in afterwards,
  // so one action covers both "sign in" and "sign up".
  async function oauth(provider: OAuthProvider, label: string) {
    setErr("");
    setMsg("");
    setOauthBusy(provider);

    // Remembered so the callback route can return the user to this language.
    // SameSite=Lax allows this on the cross-site redirect back from the
    // provider.
    document.cookie = `sf_lang=${lang}; path=/; max-age=600; SameSite=Lax`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Must also be listed under Auth > URL Configuration > Redirect URLs,
        // otherwise Supabase silently refuses the callback.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // A successful call navigates away, so anything after this is a failure.
    if (error) {
      setOauthBusy(null);
      setErr(withProvider(t.oauthFailed, label));
    }
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
        <div className="my-1 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-300" />
          {t.orContinueWith}
          <span className="h-px flex-1 bg-slate-300" />
        </div>
        {OAUTH_PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => oauth(id, t[label])}
            disabled={busy || oauthBusy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Icon />
            {oauthBusy === id ? t.loading : t[label]}
          </button>
        ))}
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