"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import CodeTimer from "@/components/CodeTimer";
import CupLogo from "@/components/CupLogo";
import { Button } from "@/components/ui";
import { useCountdown } from "@/components/useCountdown";
import { ApiError, api, type OtpRequest, type VerifyOtp } from "@/lib/api";
import { fill, formatClock, formatWait, getCopy, localizeDigits, toLatinDigits, type Locale } from "@/lib/i18n";
import { safeNext } from "@/lib/safe-redirect";
import { useAuth } from "@/lib/useAuth";

export default function LoginForm({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const router = useRouter();
  const search = useSearchParams();
  const { reload } = useAuth();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field: "phone" | "code" | null } | null>(null);
  const [demo, setDemo] = useState(false);
  // Epoch ms: when the current code stops being valid, and when a new one may be requested.
  const [codeLife, setCodeLife] = useState<{ at: number; total: number } | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const resendLeft = useCountdown(resendAt);
  const codeInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);

  // The demo hint only makes sense when the API says it is running in demo mode.
  useEffect(() => {
    api<{ demo?: boolean }>("/api/health")
      .then((h) => setDemo(h.demo === true))
      .catch(() => {});
  }, []);

  // Focus follows the step: the code field after every code request (a resend disables the button
  // that had focus), the phone field when going back. Nothing is focused on the first visit.
  useEffect(() => {
    if (codeLife) (step === "code" ? codeInput : phoneInput).current?.focus();
  }, [step, codeLife]);

  // Persian and Arabic digits are accepted and converted; +98 / 0098 / 98 prefixes become 0.
  const normalized = toLatinDigits(phone).replace(/\D/g, "").replace(/^0098|^98/, "0");
  const phoneOk = /^09\d{9}$/.test(normalized);

  function fail(err: unknown, field: "phone" | "code") {
    let text = copy.common.error;
    if (err instanceof ApiError) {
      const wait = err.retryAfter ? formatWait(err.retryAfter, locale) : "";
      if (err.code === "invalid_code") text = copy.auth.invalidCode;
      else if (err.code === "otp_cooldown") text = copy.auth.cooldown;
      else if (err.code === "rate_limited") text = fill(copy.auth.rateLimited, { t: wait });
      // A 429 carries the wait: keep the resend button locked for exactly that long.
      if (err.status === 429 && err.retryAfter) setResendAt(Date.now() + err.retryAfter * 1000);
    }
    setError({ text, field });
    // The submit button is disabled while busy, which drops its focus: put it back on the field in error.
    (field === "code" ? codeInput : phoneInput).current?.focus();
  }

  async function requestCode() {
    if (!phoneOk) {
      setError({ text: copy.auth.invalidPhone, field: "phone" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<OtpRequest>("/api/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone: normalized }),
      });
      const now = Date.now();
      setDevCode(res.dev_code);
      setCodeLife({ at: now + res.ttl_seconds * 1000, total: res.ttl_seconds });
      setResendAt(now + res.resend_after_seconds * 1000);
      setCode("");
      setStep("code");
    } catch (err) {
      fail(err, "phone");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<VerifyOtp>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: normalized, code, name: name.trim() || null }),
      });
      await reload(); // the session is an HttpOnly cookie now; this loads the user into the shared context
      router.push(safeNext(search.get("next"), res.user.role === "partner" ? `/${locale}/partner` : `/${locale}/app`));
      // Stay busy while navigating so a second tap cannot submit twice.
    } catch (err) {
      fail(err, "code");
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!busy) void (step === "phone" ? requestCode() : verify());
  }

  const cooling = resendLeft > 0;
  const resendLabel = fill(copy.auth.resendIn, { t: formatClock(resendLeft, locale) });
  const label = "text-sm font-bold";

  return (
    <div className="relative overflow-hidden">
      <div className="mesh" aria-hidden="true" />
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <form onSubmit={onSubmit} noValidate className="glass rounded-4xl p-7 sm:p-9">
          <CupLogo className="h-12 w-12" />
          <h1 className="t-title mt-5 text-2xl font-black">{copy.auth.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {step === "phone" ? copy.auth.sub : fill(copy.auth.codeSent, { phone: localizeDigits(normalized, locale) })}
          </p>

          {step === "phone" ? (
            <div className="mt-7 grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="phone" className={label}>{copy.auth.phone}</label>
                <input
                  ref={phoneInput}
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="send"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={error?.field === "phone"}
                  aria-describedby="phone-hint"
                  className="field h-14 px-5 text-center text-lg"
                />
                <p id="phone-hint" className="text-xs text-muted">{copy.auth.phoneHint}</p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="name" className={label}>{copy.auth.name}</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field h-14 px-5 text-base"
                />
              </div>
              <Button type="submit" disabled={busy || cooling} size="lg" className="mt-2 w-full">
                {busy ? copy.common.loading : cooling ? resendLabel : copy.auth.send}
              </Button>
            </div>
          ) : (
            <div className="mt-7 grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="code" className={label}>{copy.auth.code}</label>
                <input
                  ref={codeInput}
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  enterKeyHint="done"
                  value={code}
                  onChange={(e) => setCode(toLatinDigits(e.target.value).replace(/\D/g, ""))}
                  aria-invalid={error?.field === "code"}
                  className="field code-field h-16 text-2xl"
                />
              </div>

              {codeLife ? (
                <CodeTimer
                  key={codeLife.at}
                  endsAt={codeLife.at}
                  total={codeLife.total}
                  locale={locale}
                  label={copy.auth.codeLife}
                  minutesText={copy.auth.codeMinutes}
                  expiredText={copy.auth.codeExpired}
                />
              ) : null}

              {devCode ? (
                <p className="text-center text-sm font-bold text-brand-ink">
                  {copy.auth.devCode} <span dir="ltr" className="code-display">{devCode}</span>
                </p>
              ) : null}

              <Button type="submit" disabled={busy || code.length !== 6} size="lg" className="w-full">
                {busy ? copy.common.loading : copy.auth.verify}
              </Button>
              <Button variant="ghost" onClick={() => void requestCode()} disabled={busy || cooling} className="w-full">
                {cooling ? resendLabel : copy.auth.resend}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                  // The cooldown is per phone number: a corrected number may ask at once (a 429 re-locks it).
                  setResendAt(null);
                }}
                className="press min-h-11 rounded-xl text-center text-sm font-bold text-muted hover:text-ink"
              >
                {copy.auth.changePhone}
              </button>
            </div>
          )}

          {/* Always mounted, so a message that appears later is announced politely. */}
          <div aria-live="polite" className="mt-4 min-h-5 text-center text-sm font-bold text-berry-ink">
            {error?.text}
          </div>

          {step === "phone" ? (
            <div className="mt-4 grid gap-2 text-center text-xs text-muted">
              <p>{copy.auth.partnerHint}</p>
              {demo ? <p className="font-bold">{copy.auth.demoNote}</p> : null}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
