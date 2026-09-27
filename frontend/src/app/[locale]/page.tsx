import Link from "next/link";

import CafeCard from "@/components/CafeCard";
import Counter from "@/components/Counter";
import HeroVisual from "@/components/HeroVisual";
import PlanCard from "@/components/PlanCard";
import Reveal from "@/components/Reveal";
import { Badge, LinkButton, SectionTitle } from "@/components/ui";
import { getCopy, isLocale, type Locale } from "@/lib/i18n";
import { getCafes, getPlans, getStats } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fa";
  const copy = getCopy(locale);
  const [plans, cafes, stats] = await Promise.all([getPlans(), getCafes(), getStats()]);
  const packages = plans.filter((p) => p.kind === "package");
  const statItems = [
    { value: stats.cafes, label: copy.stats.cafes },
    { value: stats.cities, label: copy.stats.cities },
    { value: stats.members, label: copy.stats.members },
    { value: stats.cups_served, label: copy.stats.cups },
  ];

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden pb-20 pt-8 sm:pt-16">
        <div className="mesh" />
        <div className="absolute inset-0 -z-10 grid-lines opacity-60" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal>
              <Badge>
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {copy.hero.badge}
              </Badge>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-[2.6rem] font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                {copy.hero.title1}
                <br />
                <span className="text-gradient">{copy.hero.title2}</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{copy.hero.desc}</p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap gap-3">
                <LinkButton href={`/${locale}/plans`} size="lg">
                  {copy.hero.ctaPrimary}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </LinkButton>
                <LinkButton href={`/${locale}/cafes`} size="lg" variant="ghost">
                  {copy.hero.ctaSecondary}
                </LinkButton>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-10 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4">
                {statItems.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-black text-brand sm:text-3xl">
                      <Counter value={s.value} locale={locale} />
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-tight text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <HeroVisual locale={locale} />
          </Reveal>
        </div>
      </section>

      {/* ---------------- cafe marquee ---------------- */}
      <section className="relative border-y border-line py-6">
        <div className="flex overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-10 pe-10">
            {[...cafes, ...cafes].map((c, i) => (
              <span key={`${c.slug}-${i}`} className="whitespace-nowrap text-lg font-black text-muted/70">
                {c.name[locale]}
                <span className="mx-4 text-brand">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section id="how" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-24">
        <Reveal>
          <SectionTitle eyebrow="CUPS" title={copy.how.title} sub={copy.how.sub} />
        </Reveal>
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div className="absolute inset-x-12 top-16 hidden h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent md:block" />
          {copy.how.steps.map((step, i) => (
            <Reveal key={step.t} delay={i * 120}>
              <div className="glass group relative h-full rounded-4xl p-7 transition hover:-translate-y-1.5">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 text-xl font-black text-white shadow-[0_18px_40px_-20px_rgba(255,107,26,1)]">
                  {locale === "fa" ? ["۱", "۲", "۳"][i] : i + 1}
                </div>
                <h3 className="mt-6 text-xl font-black">{step.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- plans ---------------- */}
      <section className="relative overflow-hidden py-24">
        <div className="mesh" />
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionTitle eyebrow={copy.plans.package} title={copy.plans.title} sub={copy.plans.sub} />
          </Reveal>
          <div className="mt-14 grid items-stretch gap-6 md:grid-cols-3">
            {packages.map((plan, i) => (
              <Reveal key={plan.slug} delay={i * 110} className="h-full">
                <PlanCard plan={plan} locale={locale} />
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-10 text-center">
              <LinkButton href={`/${locale}/plans`} variant="ghost" size="lg">
                {copy.plans.subscription} ←
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- cafes ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-24">
        <Reveal>
          <SectionTitle eyebrow={copy.nav.cafes} title={copy.cafes.title} sub={copy.cafes.sub} />
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cafes.slice(0, 6).map((cafe, i) => (
            <Reveal key={cafe.slug} delay={i * 80}>
              <CafeCard cafe={cafe} locale={locale} />
            </Reveal>
          ))}
        </div>
        <Reveal delay={160}>
          <div className="mt-10 text-center">
            <LinkButton href={`/${locale}/cafes`} variant="ghost" size="lg">
              {copy.cafes.title}
            </LinkButton>
          </div>
        </Reveal>
      </section>

      {/* ---------------- partner CTA ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-ink to-ink/85 p-8 text-bg sm:p-14">
            <div className="absolute -end-20 -top-20 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
            <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="text-3xl font-black sm:text-4xl">{copy.cta.title}</h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed opacity-80">{copy.cta.desc}</p>
                <Link
                  href={`/${locale}/partner`}
                  className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand2 px-8 text-base font-bold text-white transition hover:-translate-y-0.5"
                >
                  {copy.cta.action}
                </Link>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                <p className="text-xs font-bold opacity-70">{copy.partner.chart}</p>
                <div className="mt-4 flex h-28 items-end gap-2">
                  {[35, 52, 44, 78, 61, 92, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-brand to-brand2"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- faq ---------------- */}
      <section className="mx-auto max-w-3xl px-4 py-24">
        <Reveal>
          <SectionTitle title={copy.faq.title} />
        </Reveal>
        <div className="mt-10 grid gap-3">
          {copy.faq.items.map((item, i) => (
            <Reveal key={item.q} delay={i * 70}>
              <details className="glass group rounded-3xl p-5 open:ring-1 open:ring-brand/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black">
                  {item.q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 text-brand transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
