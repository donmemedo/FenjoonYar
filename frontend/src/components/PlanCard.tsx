"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button } from "@/components/ui";
import { api, type Plan } from "@/lib/api";
import { formatNumber, formatToman, getCopy, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

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
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function buy() {
    if (!user) {
      router.push(`/${locale}/login?next=/${locale}/plans`);
      return;
    }
    setState("loading");
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({ plan_slug: plan.slug }),
      });
      setState("done");
      setTimeout(() => router.push(`/${locale}/app`), 900);
    } catch {
      setState("error");
    }
  }

  const highlight = featured ?? plan.popular;

  return (
    <div
      className={`relative flex h-full flex-col rounded-4xl p-6 transition-all duration-500 sm:p-7 ${
        highlight
          ? "bg-gradient-to-br from-brand to-brand2 text-white shadow-[0_40px_80px_-40px_rgba(255,107,26,0.95)] lg:-translate-y-3"
          : "glass hover:-translate-y-1"
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
          <p className={`mt-1.5 max-w-52 text-sm leading-relaxed ${highlight ? "text-white/80" : "text-muted"}`}>
            {plan.subtitle[locale]}
          </p>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-black ${
            highlight ? "bg-white/20" : "bg-brand/10 text-brand"
          }`}
        >
          {formatNumber(plan.cups, locale)}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-3xl font-black tracking-tight">{formatToman(plan.price, locale)}</p>
        <p className={`mt-1 text-sm ${highlight ? "text-white/80" : "text-muted"}`}>
          {formatToman(plan.per_cup, locale)} / {copy.plans.perCup}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${highlight ? "bg-white/20" : "bg-surface2/70 text-muted"}`}>
          {formatNumber(plan.validity_days, locale)} {copy.plans.validity}
        </span>
        {plan.saving_percent > 0 ? (
          highlight ? (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              {formatNumber(plan.saving_percent, locale)}٪ {copy.plans.saving}
            </span>
          ) : (
            <Badge tone="mint">
              {formatNumber(plan.saving_percent, locale)}٪ {copy.plans.saving}
            </Badge>
          )
        ) : null}
      </div>

      <Button
        onClick={buy}
        disabled={state === "loading"}
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
      {state === "error" ? <p className="mt-2 text-center text-xs text-berry">{copy.common.error}</p> : null}
    </div>
  );
}
