"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Reveal from "@/components/Reveal";
import { Button, LinkButton } from "@/components/ui";
import { ApiError, api, type PartnerSummary } from "@/lib/api";
import { formatDate, formatNumber, formatToman, getCopy, isLocale, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

export default function PartnerPage() {
  const params = useParams<{ locale: string }>();
  const locale: Locale = isLocale(params.locale) ? params.locale : "fa";
  const copy = getCopy(locale);
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await api<PartnerSummary>("/api/partner/summary"));
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user?.role === "partner") load();
  }, [ready, user, load]);

  async function confirm() {
    setBusy(true);
    setFeedback(null);
    try {
      await api("/api/partner/redemptions/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setFeedback({ tone: "ok", text: copy.partner.success });
      setCode("");
      load();
    } catch (err) {
      const key = err instanceof ApiError ? err.code : "";
      const errors = copy.partner.errors as Record<string, string>;
      setFeedback({ tone: "bad", text: errors[key] ?? copy.common.error });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p className="py-32 text-center font-bold text-muted">{copy.common.loading}</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl font-black">{copy.partner.title}</h1>
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
        <h1 className="text-2xl font-black">{copy.partner.notPartner}</h1>
        <p className="mt-2 text-sm text-muted">{copy.auth.partnerHint}</p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href={`/${locale}/app`} variant="ghost">{copy.app.title}</LinkButton>
          <Button variant="primary" onClick={() => { logout(); router.push(`/${locale}/login`); }}>
            {copy.nav.logout}
          </Button>
        </div>
      </div>
    );
  }

  const max = Math.max(1, ...(summary?.chart.map((c) => c.cups) ?? [1]));
  const cards = summary
    ? [
        { label: copy.partner.todayCups, value: formatNumber(summary.today_cups, locale) },
        { label: copy.partner.todaySettle, value: formatToman(summary.today_settle, locale) },
        { label: copy.partner.weekCups, value: formatNumber(summary.week_cups, locale) },
        { label: copy.partner.unique, value: formatNumber(summary.unique_customers, locale) },
      ]
    : [];

  return (
    <div className="relative overflow-hidden pb-10">
      <div className="mesh" />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-brand">{copy.partner.title}</p>
              <h1 className="mt-1 text-3xl font-black">{summary?.cafe?.[locale] ?? user.name}</h1>
            </div>
            <Button variant="ghost" onClick={() => { logout(); router.push(`/${locale}`); }}>
              {copy.nav.logout}
            </Button>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="glass mt-8 rounded-4xl p-7">
            <label className="text-sm font-black">{copy.partner.codeLabel}</label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirm()}
                dir="ltr"
                inputMode="numeric"
                placeholder="------"
                className="h-16 flex-1 rounded-2xl border border-line bg-surface2/50 text-center font-mono text-3xl font-black tracking-[0.4em] outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/15"
              />
              <Button onClick={confirm} disabled={busy || code.length !== 6} size="lg" className="sm:w-56">
                {busy ? copy.common.loading : copy.partner.confirm}
              </Button>
            </div>
            {feedback ? (
              <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${
                feedback.tone === "ok" ? "bg-mint/10 text-mint" : "bg-berry/10 text-berry"
              }`}>
                {feedback.text}
              </p>
            ) : null}
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <Reveal key={c.label} delay={i * 70}>
              <div className="glass rounded-3xl p-5">
                <p className="text-xs font-bold text-muted">{c.label}</p>
                <p className="mt-2 text-2xl font-black">{c.value}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {summary ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <div className="glass rounded-4xl p-7">
                <p className="text-sm font-black">{copy.partner.chart}</p>
                <div className="mt-6 flex h-40 items-end gap-2">
                  {summary.chart.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-brand to-brand2 transition-all duration-700"
                        style={{ height: `${Math.max(6, (d.cups / max) * 100)}%` }}
                        title={`${d.day}: ${d.cups}`}
                      />
                      <span className="text-[10px] font-bold text-muted">
                        {formatNumber(Number(d.day.slice(-2)), locale)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs font-bold text-muted">
                  {copy.partner.pending}: {formatToman(summary.pending_settlement, locale)}
                </p>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="glass h-full rounded-4xl p-7">
                <p className="text-sm font-black">{copy.partner.recent}</p>
                <div className="mt-4 grid gap-2">
                  {summary.recent.length ? (
                    summary.recent.map((r) => (
                      <div key={r.code} className="flex items-center justify-between rounded-2xl bg-surface2/60 px-4 py-3">
                        <span dir="ltr" className="font-mono text-sm font-bold">{r.code}</span>
                        <span className="text-xs font-bold text-muted">
                          {r.at ? formatDate(r.at, locale) : ""}
                        </span>
                        <span className="text-xs font-black text-mint">{formatToman(r.settle, locale)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm font-bold text-muted">{copy.common.empty}</p>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        ) : null}
      </div>
    </div>
  );
}
