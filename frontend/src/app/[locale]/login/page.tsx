"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import CupLogo from "@/components/CupLogo";
import { Button } from "@/components/ui";
import { api, setToken, type User } from "@/lib/api";
import { getCopy, isLocale, type Locale } from "@/lib/i18n";

function LoginForm() {
  const params = useParams<{ locale: string }>();
  const locale: Locale = isLocale(params.locale) ? params.locale : "fa";
  const copy = getCopy(locale);
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = phone.replace(/[^\d]/g, "").replace(/^0098|^\+98|^98/, "0");
  const phoneOk = /^09\d{9}$/.test(normalized);

  async function sendCode() {
    if (!phoneOk) {
      setError(copy.auth.invalidPhone);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ dev_code: string | null }>("/api/auth/request-otp", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ phone: normalized }),
      });
      setDevCode(res.dev_code);
      setStep("code");
    } catch {
      setError(copy.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>("/api/auth/verify-otp", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ phone: normalized, code, name: name || null }),
      });
      setToken(res.token);
      const next =
        search.get("next") ||
        (res.user.role === "partner" ? `/${locale}/partner` : `/${locale}/app`);
      router.push(next);
    } catch {
      setError(copy.auth.invalidCode);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "h-14 w-full rounded-2xl border border-line bg-surface2/50 px-5 text-base font-semibold outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/15";

  return (
    <div className="relative overflow-hidden">
      <div className="mesh" />
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <div className="glass rounded-4xl p-7 sm:p-9">
          <CupLogo className="h-12 w-12" />
          <h1 className="mt-5 text-2xl font-black">{copy.auth.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {step === "phone"
              ? copy.auth.sub
              : copy.auth.codeSent.replace("{phone}", normalized)}
          </p>

          {step === "phone" ? (
            <div className="mt-7 grid gap-3">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                inputMode="tel"
                dir="ltr"
                placeholder={copy.auth.phoneHint}
                aria-label={copy.auth.phone}
                className={`${field} text-center tracking-[0.2em]`}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.auth.name}
                aria-label={copy.auth.name}
                className={field}
              />
              <Button onClick={sendCode} disabled={busy} size="lg" className="mt-2 w-full">
                {busy ? copy.common.loading : copy.auth.send}
              </Button>
              <p className="mt-2 text-center text-xs text-muted">{copy.auth.partnerHint}</p>
            </div>
          ) : (
            <div className="mt-7 grid gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                inputMode="numeric"
                maxLength={6}
                dir="ltr"
                autoFocus
                aria-label={copy.auth.code}
                className={`${field} text-center font-mono text-2xl tracking-[0.5em]`}
              />
              {devCode ? (
                <p className="text-center text-sm font-bold text-brand">
                  {copy.auth.devCode} <span dir="ltr" className="font-mono">{devCode}</span>
                </p>
              ) : null}
              <Button onClick={verify} disabled={busy || code.length < 4} size="lg" className="w-full">
                {busy ? copy.common.loading : copy.auth.verify}
              </Button>
              <button
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="mt-1 text-center text-sm font-bold text-muted transition hover:text-brand"
              >
                {copy.auth.changePhone}
              </button>
            </div>
          )}

          {error ? <p className="mt-4 text-center text-sm font-bold text-berry">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="py-32 text-center font-bold text-muted">…</p>}>
      <LoginForm />
    </Suspense>
  );
}
