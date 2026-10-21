"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { Button, LinkButton, groupCode, riseDelay } from "@/components/ui";
import { useCountdown } from "@/components/useCountdown";
import { ApiError, api, type PartnerConfirm, type PartnerSummary } from "@/lib/api";
import { fill, formatClock, formatDate, formatDay, formatNumber, formatToman, formatWait, getCopy, toLatinDigits, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

type Feedback = { tone: "ok"; result: PartnerConfirm } | { tone: "bad"; text: string };

export default function PartnerView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const lockLeft = useCountdown(lockUntil);
  const input = useRef<HTMLInputElement>(null);

  const isPartner = ready && user?.role === "partner";

  const load = useCallback(async () => {
    try {
      setSummary(await api<PartnerSummary>("/api/partner/summary"));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (isPartner) void load();
  }, [isPartner, load]);

  async function confirm() {
    if (code.length !== 8) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await api<PartnerConfirm>("/api/partner/redemptions/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setFeedback({ tone: "ok", result });
      setCode("");
      void load();
    } catch (err) {
      const errors = copy.partner.errors as Record<string, string>;
      const key = err instanceof ApiError ? err.code : "";
      const retry = err instanceof ApiError ? err.retryAfter : undefined;
      // Too many wrong codes: say how long to wait and keep the button locked for exactly that long.
      if (key === "rate_limited" && retry) setLockUntil(Date.now() + retry * 1000);
      setFeedback({ tone: "bad", text: fill(errors[key] ?? copy.common.error, { t: retry ? formatWait(retry, locale) : "" }) });
    } finally {
      setBusy(false);
      // The button was disabled while busy and lost focus: the next code goes straight into the field.
      input.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!busy && lockLeft === 0) void confirm();
  }

  async function leave(to: string) {
    await logout();
    router.push(to);
  }

  if (!ready) return <p role="status" className="py-32 text-center font-bold text-muted">{copy.common.loading}</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="t-title text-3xl font-black">{copy.partner.title}</h1>
        <p className="mt-3 text-muted">{copy.partner.sub}</p>
        <p className="mt-2 text-sm text-muted">{copy.auth.partnerHint}</p>
        <LinkButton href={`/${locale}/login?next=/${locale}/partner`} size="lg" className="mt-7">
          {copy.nav.login}
        </LinkButton>
      </div>
    );
  }

  if (user.role !== "partner") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="t-title text-2xl font-black">{copy.partner.notPartner}</h1>
        <p className="mt-2 text-sm text-muted">{copy.auth.partnerHint}</p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href={`/${locale}/app`} variant="ghost">{copy.app.title}</LinkButton>
          <Button onClick={() => void leave(`/${locale}/login`)}>{copy.nav.logout}</Button>
        </div>
      </div>
    );
  }

  const chart = summary?.chart ?? [];
  const max = Math.max(1, ...chart.map((c) => c.cups));
  const weekTotal = chart.reduce((n, c) => n + c.cups, 0);
  const cards = summary
    ? [
        { label: copy.partner.todayCups, value: formatNumber(summary.today_cups, locale) },
        { label: copy.partner.todaySettle, value: formatToman(summary.today_settle, locale) },
        { label: copy.partner.weekCups, value: formatNumber(summary.week_cups, locale) },
        { label: copy.partner.unique, value: formatNumber(summary.unique_customers, locale) },
      ]
    : [];
  const drinkLabels = copy.app.drinks as Record<string, string>;

  return (
    <div className="relative overflow-hidden pb-10">
      <div className="mesh" aria-hidden="true" />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rise flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-ink">{copy.partner.title}</p>
            <h1 className="mt-1 text-3xl font-black">{summary?.cafe?.[locale] ?? user.name ?? copy.partner.title}</h1>
          </div>
          <Button variant="ghost" onClick={() => void leave(`/${locale}`)}>{copy.nav.logout}</Button>
        </div>

        <form onSubmit={onSubmit} noValidate className="rise glass mt-8 rounded-4xl p-7" style={riseDelay(80)}>
          <label htmlFor="redeem-code" className="text-sm font-black">{copy.partner.codeLabel}</label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              ref={input}
              id="redeem-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{8}"
              maxLength={8}
              enterKeyHint="done"
              value={code}
              onChange={(e) => setCode(toLatinDigits(e.target.value).replace(/\D/g, "").slice(0, 8))}
              aria-invalid={feedback?.tone === "bad"}
              aria-describedby="partner-feedback"
              className="field code-field h-16 flex-1 text-2xl sm:text-3xl"
            />
            <Button type="submit" disabled={busy || code.length !== 8 || lockLeft > 0} aria-busy={busy} size="lg" className="sm:w-56">
              {busy ? copy.common.loading : lockLeft > 0 ? fill(copy.common.retryIn, { t: formatClock(lockLeft, locale) }) : copy.partner.confirm}
            </Button>
          </div>

          {/* Always mounted: the outcome of each attempt is announced politely. */}
          <div id="partner-feedback" aria-live="polite" className="mt-4">
            {feedback?.tone === "bad" ? (
              <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm font-bold text-berry-ink">{feedback.text}</p>
            ) : null}
            {feedback?.tone === "ok" ? (
              // Only what the API returns: the drink and the settlement. No customer name or phone.
              <div className="rounded-2xl bg-mint/10 px-4 py-4">
                <p className="text-sm font-black text-mint-ink">{copy.partner.success}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-bold text-muted">{copy.partner.result.drink}</dt>
                    <dd className="mt-0.5 font-black">{drinkLabels[feedback.result.drink] ?? feedback.result.drink}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">{copy.partner.result.settle}</dt>
                    <dd className="mt-0.5 font-black">{formatToman(feedback.result.settle_toman, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">{copy.partner.result.time}</dt>
                    <dd className="mt-0.5 font-black">{formatDate(feedback.result.confirmed_at, locale)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </form>

        {loadFailed && !summary ? (
          <div className="mt-8 text-center">
            <p role="alert" className="font-bold text-berry-ink">{copy.common.error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => void load()}>{copy.common.retry}</Button>
          </div>
        ) : null}

        {summary ? (
          <>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((c) => (
                <div key={c.label} className="glass rounded-3xl p-5">
                  <dt className="text-xs font-bold text-muted">{c.label}</dt>
                  <dd className="mt-2 text-2xl font-black">{c.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <figure className="glass m-0 rounded-4xl p-7">
                <figcaption className="text-sm font-black">{copy.partner.chart}</figcaption>
                {/* The bars are decoration; the same numbers are in the table below for screen readers. */}
                <div aria-hidden="true" className="mt-6 flex h-40 items-end gap-2">
                  {chart.map((d, i) => (
                    <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${formatDay(d.day, locale)}: ${formatNumber(d.cups, locale)}`}>
                      <div
                        className="bar w-full rounded-t-xl bg-gradient-to-t from-brand to-brand2"
                        style={{ height: `${Math.max(3, (d.cups / max) * 76)}%`, ...riseDelay(i * 60) }}
                      />
                      <span className="text-[11px] font-bold text-muted">{formatDay(d.day, locale, true)}</span>
                    </div>
                  ))}
                </div>
                {weekTotal === 0 ? <p className="mt-4 text-sm font-bold text-muted">{copy.partner.chartEmpty}</p> : null}
                <table className="sr-only">
                  <caption>{copy.partner.chart}</caption>
                  <thead>
                    <tr><th scope="col">{copy.partner.day}</th><th scope="col">{copy.partner.cupsCol}</th></tr>
                  </thead>
                  <tbody>
                    {chart.map((d) => (
                      <tr key={d.day}><th scope="row">{formatDay(d.day, locale)}</th><td>{formatNumber(d.cups, locale)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-6 text-xs font-bold text-muted">
                  {copy.partner.pending}: {formatToman(summary.pending_settlement, locale)}
                </p>
              </figure>

              <section aria-labelledby="recent-title" className="glass rounded-4xl p-7">
                <h2 id="recent-title" className="text-sm font-black">{copy.partner.recent}</h2>
                {summary.recent.length ? (
                  <ul className="mt-4 grid gap-2">
                    {summary.recent.map((r) => (
                      <li key={`${r.code}-${r.at}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface2/60 px-4 py-3">
                        <span dir="ltr" className="code-display text-sm">{groupCode(r.code)}</span>
                        <span className="text-xs font-bold text-muted">{r.at ? formatDate(r.at, locale) : ""}</span>
                        <span className="text-xs font-black text-mint-ink">{formatToman(r.settle, locale)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm font-bold text-muted">{copy.common.empty}</p>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
