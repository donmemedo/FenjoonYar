"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import CodeTimer from "@/components/CodeTimer";
import QrCode from "@/components/QrCode";
import { Badge, Button, LinkButton, groupCode, riseDelay } from "@/components/ui";
import { ApiError, api, type Cafe, type Order, type Redemption, type Wallet } from "@/lib/api";
import { fill, formatDate, formatNumber, formatToman, formatWait, getCopy, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

const DRINKS = ["espresso", "latte", "cappuccino", "filter", "cold"] as const;
const LIFETIME = 600; // seconds: the ring's full circle when the API gives no better figure

const statusTone = { confirmed: "mint", pending: "brand", expired: "muted", cancelled: "muted" } as const;
const orderTone = { paid: "mint", pending: "brand", failed: "muted" } as const;

export default function AccountView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [drink, setDrink] = useState<string>("espresso");
  const [cafeSlug, setCafeSlug] = useState("");
  const [active, setActive] = useState<Redemption | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<"history" | "orders">("history");
  const leaving = useRef(false);

  const isCustomer = ready && !!user && user.role !== "partner";

  const load = useCallback(async () => {
    try {
      const [w, o, r] = await Promise.all([
        api<Wallet>("/api/wallet"),
        api<Order[]>("/api/orders"),
        api<Redemption[]>("/api/redemptions"),
      ]);
      setWallet(w);
      setOrders(o);
      setRedemptions(r);
      const now = Date.now();
      setActive(r.find((x) => x.status === "pending" && Date.parse(x.expires_at) > now) ?? null);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || leaving.current) return;
    if (!user) {
      router.replace(`/${locale}/login?next=/${locale}/app`);
    } else if (user.role === "partner") {
      router.replace(`/${locale}/partner`);
    }
  }, [ready, user, router, locale]);

  useEffect(() => {
    if (isCustomer) void load();
  }, [isCustomer, load]);

  // The cafe list is public and rarely changes: fetched once, not on every refresh of the wallet.
  useEffect(() => {
    if (isCustomer) api<Cafe[]>("/api/cafes").then(setCafes, () => {});
  }, [isCustomer]);

  // While a code is live, ask whether the cafe confirmed it. Only while the tab is visible: a hidden
  // tab neither polls nor wakes the radio, and it checks straight away when it comes back.
  const activeCode = active?.code;
  useEffect(() => {
    if (!activeCode) return;
    const check = async () => {
      if (document.hidden) return;
      try {
        const fresh = await api<Redemption>(`/api/redemptions/${activeCode}`);
        if (fresh.status !== "pending") {
          // A check still in flight when a newer code was made must not clear that newer code.
          setActive((a) => (a?.code === activeCode ? null : a));
          void load();
        }
      } catch {
        /* keep the code on screen if the check fails */
      }
    };
    const id = setInterval(check, 5000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [activeCode, load]);

  async function createCode() {
    setBusy(true);
    setMessage("");
    try {
      const red = await api<Redemption>("/api/redemptions", {
        method: "POST",
        body: JSON.stringify({ drink, cafe_slug: cafeSlug || null }),
      });
      setActive(red);
      void load();
    } catch (err) {
      const errors = copy.app.errors as Record<string, string>;
      const code = err instanceof ApiError ? err.code : "";
      const wait = err instanceof ApiError && err.retryAfter ? formatWait(err.retryAfter, locale) : "";
      setMessage(fill(errors[code] ?? copy.common.error, { t: wait }));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    leaving.current = true; // stops the effect above from sending us to /login while we go home
    await logout();
    router.push(`/${locale}`);
  }

  if (!isCustomer) {
    return <p role="status" className="py-32 text-center font-bold text-muted">{copy.common.loading}</p>;
  }
  if (!wallet) {
    return loadFailed ? (
      <div className="mx-auto max-w-md px-4 py-32 text-center">
        <p role="alert" className="font-bold text-berry-ink">{copy.app.loadError}</p>
        <Button variant="ghost" className="mt-6" onClick={() => void load()}>{copy.common.retry}</Button>
      </div>
    ) : (
      <p role="status" className="py-32 text-center font-bold text-muted">{copy.common.loading}</p>
    );
  }

  const drinkLabels = copy.app.drinks as Record<string, string>;
  const activeTotal = active
    ? Math.round((Date.parse(active.expires_at) - Date.parse(active.created_at)) / 1000) || LIFETIME
    : LIFETIME;

  return (
    <div className="relative overflow-hidden pb-10">
      <div className="mesh" aria-hidden="true" />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rise flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-muted">
              {copy.app.hello} <span aria-hidden="true">👋</span>
            </p>
            <h1 className="mt-1 text-3xl font-black"><bdi>{user?.name || user?.phone}</bdi></h1>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/${locale}/plans`} variant="ghost">{copy.app.buyMore}</LinkButton>
            <Button variant="ghost" onClick={() => void leave()}>{copy.nav.logout}</Button>
          </div>
        </div>

        {/* wallet */}
        <div className="rise mt-8 grid gap-4 sm:grid-cols-[1.3fr_1fr]" style={riseDelay(80)}>
          <section aria-labelledby="wallet-title" className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand to-brand2 p-7 text-on-brand shadow-[0_40px_80px_-45px_rgba(255,107,26,1)]">
            <div aria-hidden="true" className="absolute -end-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.4),transparent)]" />
            <h2 id="wallet-title" className="relative text-xs font-bold">{copy.app.wallet}</h2>
            <p className="relative mt-2 text-6xl font-black leading-none">{formatNumber(wallet.cups_remaining, locale)}</p>
            <p className="relative mt-2 text-sm font-bold">{copy.app.remaining}</p>
            <div className="relative mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
              <span>{copy.app.used}: {formatNumber(wallet.cups_used, locale)}</span>
              {wallet.cups_expired > 0 ? (
                <span>{copy.app.expired}: {formatNumber(wallet.cups_expired, locale)}</span>
              ) : null}
              {wallet.next_expiry ? (
                <span>{copy.app.nextExpiry}: {formatDate(wallet.next_expiry, locale)}</span>
              ) : null}
              {wallet.expiring_soon > 0 ? (
                <span className="rounded-full bg-on-brand/10 px-3 py-1">
                  {copy.app.expiring}: {formatNumber(wallet.expiring_soon, locale)}
                </span>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="new-code-title" className="glass grid content-between rounded-4xl p-6">
            <div>
              <h2 id="new-code-title" className="text-sm font-black">{copy.app.newCode}</h2>
              <div role="group" aria-label={copy.app.drink} className="mt-4 flex flex-wrap gap-2">
                {DRINKS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={drink === d}
                    onClick={() => setDrink(d)}
                    className={`press min-h-11 rounded-full border px-4 py-2 text-sm font-bold ${
                      drink === d ? "border-brand bg-brand text-on-brand" : "border-line bg-surface2/60 text-muted hover:text-ink"
                    }`}
                  >
                    {drinkLabels[d]}
                  </button>
                ))}
              </div>
              <label htmlFor="cafe" className="sr-only">{copy.app.cafe}</label>
              <select
                id="cafe"
                value={cafeSlug}
                onChange={(e) => setCafeSlug(e.target.value)}
                className="field mt-4 h-12 px-4 text-sm"
              >
                <option value="">{copy.app.anyCafe}</option>
                {cafes.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name[locale]}</option>
                ))}
              </select>
            </div>
            <div>
              <Button
                onClick={() => void createCode()}
                disabled={busy || wallet.cups_remaining === 0}
                aria-busy={busy}
                size="lg"
                className="mt-5 w-full"
              >
                {wallet.cups_remaining === 0 ? copy.app.noCups : copy.app.newCode}
              </Button>
              {/* Always mounted so errors (no cups, too many codes) are announced when they appear. */}
              <p aria-live="polite" className="mt-3 min-h-5 text-center text-sm font-bold text-berry-ink">{message}</p>
            </div>
          </section>
        </div>

        {/* live code */}
        {active ? (
          <section aria-labelledby="code-title" className="glass mt-6 grid items-center gap-6 rounded-4xl p-7 ring-1 ring-brand/30 sm:grid-cols-[auto_1fr]">
            <QrCode value={active.qr_payload} label={copy.app.qrLabel} size={190} />
            <div>
              <Badge>{copy.app.status.pending}</Badge>
              <h2 id="code-title" className="mt-3 text-sm font-bold text-muted">{copy.app.codeTitle}</h2>
              <p dir="ltr" className="code-display mt-1 text-4xl text-brand-ink sm:text-5xl">{groupCode(active.code)}</p>
              <p className="mt-3 text-sm text-muted">{copy.app.codeHelp}</p>
              <p className="mt-1 text-xs font-bold text-muted">
                {drinkLabels[active.drink] ?? active.drink}
                {active.cafe ? ` · ${active.cafe[locale]}` : ""}
              </p>
              <div className="mt-4">
                <CodeTimer
                  key={active.code}
                  endsAt={Date.parse(active.expires_at)}
                  total={activeTotal}
                  locale={locale}
                  label={copy.app.codeLife}
                  minutesText={copy.app.codeMinutes}
                  expiredText={copy.app.codeExpired}
                  onExpire={() => {
                    setActive(null);
                    void load();
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* tabs: a labelled group of toggle buttons (no arrow-key tablist to maintain) */}
        <div role="group" aria-label={copy.app.sections} className="mt-10 flex gap-2">
          {(["history", "orders"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`press min-h-11 rounded-full px-5 py-2.5 text-sm font-black ${
                tab === t ? "bg-ink text-bg" : "border border-line bg-surface2/60 text-muted hover:text-ink"
              }`}
            >
              {t === "history" ? copy.app.history : copy.app.orders}
            </button>
          ))}
        </div>

        <ul className="mt-5 grid gap-3">
          {tab === "history"
            ? redemptions.map((r) => (
                <li key={r.id} className="glass flex items-center justify-between gap-4 rounded-3xl p-4">
                  <div>
                    <p className="font-black">{drinkLabels[r.drink] ?? r.drink}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(r.created_at, locale)}
                      {r.cafe ? ` · ${r.cafe[locale]}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span dir="ltr" className="code-display text-sm text-muted">{groupCode(r.code)}</span>
                    <Badge tone={statusTone[r.status]}>{copy.app.status[r.status]}</Badge>
                  </div>
                </li>
              ))
            : orders.map((o) => (
                <li key={o.id} className="glass flex items-center justify-between gap-4 rounded-3xl p-4">
                  <div>
                    <p className="font-black">{o.plan[locale]}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatDate(o.created_at, locale)}</p>
                    {o.status === "pending" ? <p className="mt-1 text-xs text-muted">{copy.app.orderPending}</p> : null}
                  </div>
                  <div className="text-end">
                    <p className="font-black">{formatToman(o.amount, locale)}</p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <Badge tone={orderTone[o.status]}>{copy.app.orderStatus[o.status]}</Badge>
                      <span className={`text-xs font-bold ${o.status === "paid" ? "text-mint-ink" : "text-muted"}`}>
                        {o.status === "paid" ? "+" : ""}{formatNumber(o.cups, locale)} {copy.common.cups}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
        </ul>
        {(tab === "history" ? redemptions : orders).length === 0 ? (
          <div className="glass mt-5 rounded-3xl p-10 text-center">
            <p className="font-bold text-muted">{copy.common.empty}</p>
            <Link href={`/${locale}/plans`} className="mt-3 inline-block rounded-lg py-2 font-black text-brand-ink">
              {copy.app.buyMore}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
