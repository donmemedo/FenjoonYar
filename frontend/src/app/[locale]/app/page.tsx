"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import QrCode from "@/components/QrCode";
import Reveal from "@/components/Reveal";
import { Badge, Button, LinkButton } from "@/components/ui";
import { api, type Cafe, type Order, type Redemption, type Wallet } from "@/lib/api";
import { formatDate, formatNumber, formatToman, getCopy, isLocale, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

const DRINKS = ["espresso", "latte", "cappuccino", "filter", "cold"] as const;

export default function AppPage() {
  const params = useParams<{ locale: string }>();
  const locale: Locale = isLocale(params.locale) ? params.locale : "fa";
  const copy = getCopy(locale);
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [drink, setDrink] = useState<string>("espresso");
  const [cafeSlug, setCafeSlug] = useState<string>("");
  const [active, setActive] = useState<Redemption | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"history" | "orders">("history");

  const load = useCallback(async () => {
    const [w, o, r, c] = await Promise.all([
      api<Wallet>("/api/wallet"),
      api<Order[]>("/api/orders"),
      api<Redemption[]>("/api/redemptions"),
      api<Cafe[]>("/api/cafes", { auth: false }),
    ]);
    setWallet(w);
    setOrders(o);
    setRedemptions(r);
    setCafes(c);
    const pending = r.find((x) => x.status === "pending" && new Date(x.expires_at) > new Date());
    setActive(pending ?? null);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (user.role === "partner") {
      router.replace(`/${locale}/partner`);
      return;
    }
    load().catch(() => {});
  }, [ready, user, router, locale, load]);

  // countdown + auto refresh while a code is live
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const ms = new Date(active.expires_at).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
      if (ms <= 0) setActive(null);
    };
    tick();
    const t = setInterval(tick, 1000);
    const poll = setInterval(async () => {
      try {
        const fresh = await api<Redemption>(`/api/redemptions/${active.code}`);
        if (fresh.status !== "pending") {
          setActive(null);
          load();
        }
      } catch {
        /* keep the code on screen if the check fails */
      }
    }, 5000);
    return () => {
      clearInterval(t);
      clearInterval(poll);
    };
  }, [active, load]);

  async function createCode() {
    setBusy(true);
    try {
      const red = await api<Redemption>("/api/redemptions", {
        method: "POST",
        body: JSON.stringify({ drink, cafe_slug: cafeSlug || null }),
      });
      setActive(red);
      load();
    } catch {
      /* the empty-wallet case is already shown in the UI */
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user || !wallet) {
    return <p className="py-32 text-center font-bold text-muted">{copy.common.loading}</p>;
  }

  const statusTone = { confirmed: "mint", pending: "brand", expired: "muted", cancelled: "muted" } as const;
  const drinkLabels = copy.app.drinks as Record<string, string>;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="relative overflow-hidden pb-10">
      <div className="mesh" />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted">{copy.app.hello} 👋</p>
              <h1 className="mt-1 text-3xl font-black">{user.name || user.phone}</h1>
            </div>
            <div className="flex gap-2">
              <LinkButton href={`/${locale}/plans`} variant="ghost">{copy.app.buyMore}</LinkButton>
              <Button variant="ghost" onClick={() => { logout(); router.push(`/${locale}`); }}>
                {copy.nav.logout}
              </Button>
            </div>
          </div>
        </Reveal>

        {/* wallet */}
        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand to-brand2 p-7 text-white shadow-[0_40px_80px_-45px_rgba(255,107,26,1)]">
              <div className="absolute -end-10 -top-10 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
              <p className="text-xs font-bold opacity-85">{copy.app.wallet}</p>
              <p className="mt-2 text-6xl font-black leading-none">{formatNumber(wallet.cups_remaining, locale)}</p>
              <p className="mt-2 text-sm font-bold opacity-85">{copy.app.remaining}</p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold opacity-90">
                <span>{copy.app.used}: {formatNumber(wallet.cups_used, locale)}</span>
                {wallet.next_expiry ? (
                  <span>{copy.app.nextExpiry}: {formatDate(wallet.next_expiry, locale)}</span>
                ) : null}
                {wallet.expiring_soon > 0 ? (
                  <span className="rounded-full bg-black/25 px-3 py-1">
                    {copy.app.expiring}: {formatNumber(wallet.expiring_soon, locale)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="glass grid content-between rounded-4xl p-6">
              <div>
                <p className="text-sm font-black">{copy.app.newCode}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {DRINKS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDrink(d)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        drink === d ? "border-brand bg-brand text-white" : "border-line bg-surface2/60 text-muted"
                      }`}
                    >
                      {drinkLabels[d]}
                    </button>
                  ))}
                </div>
                <select
                  value={cafeSlug}
                  onChange={(e) => setCafeSlug(e.target.value)}
                  className="mt-4 h-12 w-full rounded-2xl border border-line bg-surface2/50 px-4 text-sm font-bold outline-none focus:border-brand/60"
                >
                  <option value="">{copy.app.anyCafe}</option>
                  {cafes.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name[locale]}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={createCode}
                disabled={busy || wallet.cups_remaining === 0}
                size="lg"
                className="mt-5 w-full"
              >
                {wallet.cups_remaining === 0 ? copy.app.noCups : copy.app.newCode}
              </Button>
            </div>
          </div>
        </Reveal>

        {/* live code */}
        {active ? (
          <div className="glass mt-6 grid items-center gap-6 rounded-4xl p-7 ring-1 ring-brand/30 sm:grid-cols-[auto_1fr]">
            <QrCode value={active.qr_payload} size={190} />
            <div>
              <Badge>{copy.app.status.pending}</Badge>
              <p className="mt-3 text-sm font-bold text-muted">{copy.app.codeTitle}</p>
              <p dir="ltr" className="mt-1 font-mono text-5xl font-black tracking-[0.25em] text-brand">
                {active.code}
              </p>
              <p className="mt-3 text-sm text-muted">{copy.app.codeHelp}</p>
              <p dir="ltr" className="mt-2 font-mono text-lg font-black">{mm}:{ss}</p>
              <p className="mt-1 text-xs font-bold text-muted">
                {drinkLabels[active.drink] ?? active.drink}
                {active.cafe ? ` · ${active.cafe[locale]}` : ""}
              </p>
            </div>
          </div>
        ) : null}

        {/* tabs */}
        <div className="mt-10 flex gap-2">
          {(["history", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                tab === t ? "bg-ink text-bg" : "border border-line bg-surface2/60 text-muted"
              }`}
            >
              {t === "history" ? copy.app.history : copy.app.orders}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {tab === "history"
            ? (redemptions.length ? redemptions : []).map((r) => (
                <div key={r.id} className="glass flex items-center justify-between gap-4 rounded-3xl p-4">
                  <div>
                    <p className="font-black">{drinkLabels[r.drink] ?? r.drink}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(r.created_at, locale)}
                      {r.cafe ? ` · ${r.cafe[locale]}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span dir="ltr" className="font-mono text-sm font-bold text-muted">{r.code}</span>
                    <Badge tone={statusTone[r.status]}>{copy.app.status[r.status]}</Badge>
                  </div>
                </div>
              ))
            : orders.map((o) => (
                <div key={o.id} className="glass flex items-center justify-between gap-4 rounded-3xl p-4">
                  <div>
                    <p className="font-black">{o.plan[locale]}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatDate(o.created_at, locale)}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-black">{formatToman(o.amount, locale)}</p>
                    <p className="text-xs font-bold text-mint">
                      +{formatNumber(o.cups, locale)} {copy.common.cups}
                    </p>
                  </div>
                </div>
              ))}
          {(tab === "history" ? redemptions : orders).length === 0 ? (
            <div className="glass rounded-3xl p-10 text-center">
              <p className="font-bold text-muted">{copy.common.empty}</p>
              <Link href={`/${locale}/plans`} className="mt-3 inline-block font-black text-brand">
                {copy.app.buyMore}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
