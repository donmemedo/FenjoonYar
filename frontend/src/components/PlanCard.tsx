"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge, Button } from "@/components/ui";
import { ApiError, api, type Order, type Plan } from "@/lib/api";
import { fill, formatNumber, formatToman, formatWait, getCopy, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

type State = "idle" | "loading" | "done" | "pending" | "error";

export default function PlanCard({
  plan,
  locale,
  featured,
}: {
  plan: Plan;
  locale: Locale;
  featured?: boolean;
}) {
  const copy = getCopy(locale);
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  // Paid: show the confirmation for a moment, then open the wallet.
  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => router.push(`/${locale}/app`), 900);
    return () => clearTimeout(t);
  }, [state, router, locale]);

  async function buy() {
    if (!user) {
      router.push(`/${locale}/login?next=/${locale}/plans`);
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const order = await api<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ plan_slug: plan.slug }),
      });
      // No payment gateway yet: the order is saved as pending and nothing is credited. Say so plainly
      // instead of showing the success state.
      setState(order.status === "paid" && !order.payment_required ? "done" : "pending");
    } catch (err) {
      const errors = copy.plans.errors as Record<string, string>;
      const code = err instanceof ApiError ? err.code : "";
      const wait = err instanceof ApiError && err.retryAfter ? formatWait(err.retryAfter, locale) : "";
      setMessage(fill(errors[code] ?? copy.common.error, { t: wait }));
      setState("error");
    }
  }

  const highlight = featured ?? plan.popular;
  // Ink on the orange card: white fails AA there.
  const soft = highlight ? "text-on-brand/85" : "text-muted";
  const pill = highlight ? "bg-on-brand/10" : "bg-surface2/70 text-muted";
  const percent = locale === "fa" ? "٪" : "%";

  return (
    <div
      className={`tilt relative flex h-full flex-col rounded-4xl p-6 sm:p-7 ${
        highlight
          ? "bg-gradient-to-br from-brand to-brand2 text-on-brand shadow-[0_40px_80px_-40px_rgba(255,107,26,0.95)] lg:-translate-y-3"
          : "glass"
      }`}
    >
      {highlight ? (
        <span className="absolute -top-3 inline-flex rounded-full bg-ink px-4 py-1 text-[11px] font-black text-bg">
          {copy.plans.popular}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">{plan.title[locale]}</h3>
          <p className={`mt-1.5 max-w-52 text-sm leading-relaxed ${soft}`}>{plan.subtitle[locale]}</p>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-black ${
            highlight ? "bg-on-brand/10" : "bg-brand/10 text-brand-ink"
          }`}
        >
          <span aria-hidden="true">{formatNumber(plan.cups, locale)}</span>
          <span className="sr-only">{formatNumber(plan.cups, locale)} {copy.common.cups}</span>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-3xl font-black">{formatToman(plan.price, locale)}</p>
        <p className={`mt-1 text-sm ${soft}`}>
          {formatToman(plan.per_cup, locale)} / {copy.plans.perCup}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${pill}`}>
          {formatNumber(plan.validity_days, locale)} {copy.plans.validity}
        </span>
        {plan.saving_percent > 0 ? (
          highlight ? (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${pill}`}>
              {formatNumber(plan.saving_percent, locale)}{percent} {copy.plans.saving}
            </span>
          ) : (
            <Badge tone="mint">
              {formatNumber(plan.saving_percent, locale)}{percent} {copy.plans.saving}
            </Badge>
          )
        ) : null}
      </div>

      <Button
        onClick={buy}
        // Pending: one unpaid order is enough; another tap would only stack more of them.
        disabled={state === "loading" || state === "done" || state === "pending"}
        aria-busy={state === "loading"}
        variant={highlight ? "dark" : "primary"}
        size="lg"
        className="mt-7 w-full"
      >
        {state === "done"
          ? copy.plans.bought
          : state === "loading"
            ? copy.common.loading
            : user
              ? copy.plans.buy
              : copy.plans.buyLogin}
      </Button>

      {/* Always mounted so the polite announcement fires when the text appears. */}
      <div aria-live="polite" className="mt-3 text-center text-sm font-bold">
        {state === "pending" ? (
          <>
            <p className={soft}>{copy.plans.paymentPending}</p>
            <Link href={`/${locale}/app`} className="mt-2 inline-block rounded-lg py-1 font-black underline underline-offset-4">
              {copy.plans.viewOrders}
            </Link>
          </>
        ) : null}
        {state === "error" ? <p className={highlight ? "text-on-brand" : "text-berry-ink"}>{message}</p> : null}
      </div>
    </div>
  );
}
