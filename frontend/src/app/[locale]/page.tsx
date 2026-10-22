import type { Metadata } from "next";
import Link from "next/link";

import CafeCard from "@/components/CafeCard";
import Counter from "@/components/Counter";
import HeroVisual from "@/components/HeroVisual";
import PlanCard from "@/components/PlanCard";
import Reveal from "@/components/Reveal";
import { Arrow, Badge, LinkButton, SectionTitle, riseDelay } from "@/components/ui";
import { formatNumber, getCopy, localeOf } from "@/lib/i18n";
import { getCafes, getPlans, getStats } from "@/lib/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // The home page keeps the full brand title (no "%s | brand" template).
  return { title: { absolute: getCopy(await localeOf(params)).meta.title } };
}

export default async function HomePage({ params }: Props) {
  const locale = await localeOf(params);
  const copy = getCopy(locale);
  const [plans, cafes, stats] = await Promise.all([getPlans(), getCafes(), getStats()]);
  const packages = plans.filter((p) => p.kind === "package");

  // Real counts only. A tile whose value is 0 (empty database, or the API was unreachable) is hidden
  // rather than shown as a discouraging or invented number.
  const statItems = [
    { value: stats.cafes, label: copy.stats.cafes },
    { value: stats.cities, label: copy.stats.cities },
    { value: stats.members, label: copy.stats.members },
    { value: stats.cups_served, label: copy.stats.cups },
  ].filter((s) => s.value > 0);

  // The marquee shifts by exactly half its width, so each half must be wider than the screen: repeat a
  // short list until it has enough names.
  const names = cafes.length ? Array.from({ length: Math.ceil(8 / cafes.length) }, () => cafes).flat() : [];
  const marqueeHalf = names.map((c, i) => (
    <li key={`${c.slug}-${i}`} className="whitespace-nowrap text-lg font-black text-muted">
      {c.name[locale]}
      <span aria-hidden="true" className="mx-4 text-brand-ink">✦</span>
    </li>
  ));

  return (
    <>
      {/* ---------------- hero: plain CSS entrance (.rise), so first paint never waits for JavaScript ---------------- */}
      <section className="relative overflow-hidden pb-20 pt-8 sm:pt-16">
        <div className="mesh" aria-hidden="true" />
        <div className="grid-lines absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="rise" style={riseDelay(0)}>
              <Badge>
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                {copy.hero.badge}
              </Badge>
            </div>
            <h1 className="rise t-display mt-6 text-[2.6rem] font-black sm:text-6xl lg:text-7xl" style={riseDelay(80)}>
              {copy.hero.title1}
              <br />
              <span className="text-gradient">{copy.hero.title2}</span>
            </h1>
            <p className="rise mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={riseDelay(160)}>
              {copy.hero.desc}
            </p>
            <div className="rise mt-9 flex flex-wrap gap-3" style={riseDelay(240)}>
              <LinkButton href={`/${locale}/plans`} size="lg">
                {copy.hero.ctaPrimary}
                <Arrow />
              </LinkButton>
              <LinkButton href={`/${locale}/cafes`} size="lg" variant="ghost">
                {copy.hero.ctaSecondary}
              </LinkButton>
            </div>
            {statItems.length ? (
              <dl className="rise mt-10 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4" style={riseDelay(320)}>
                {statItems.map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <dt className="order-2 mt-1 text-xs font-semibold leading-tight text-muted">{s.label}</dt>
                    <dd className="order-1 text-2xl font-black text-brand-ink sm:text-3xl">
                      <Counter value={s.value} locale={locale} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <div className="rise" style={riseDelay(200)}>
            <HeroVisual locale={locale} />
          </div>
        </div>
      </section>

      {/* ---------------- cafe marquee: decorative repeat, the second half is hidden from assistive tech ---------------- */}
      {names.length ? (
        <section aria-label={copy.cafes.title} className="relative border-y border-line py-6">
          <div className="marquee">
            <div className="marquee-track">
              <ul className="flex shrink-0 items-center gap-10 pe-10">{marqueeHalf}</ul>
              <ul aria-hidden="true" className="flex shrink-0 items-center gap-10 pe-10">{marqueeHalf}</ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------- how it works ---------------- */}
      <section id="how" className="cv-auto relative mx-auto max-w-7xl scroll-mt-28 px-4 py-24">
        <Reveal>
          <SectionTitle eyebrow="CUPS" title={copy.how.title} sub={copy.how.sub} />
        </Reveal>
        <div className="relative mt-14">
          <div aria-hidden="true" className="absolute inset-x-12 top-16 hidden h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent md:block" />
          <ol className="grid gap-6 md:grid-cols-3">
            {copy.how.steps.map((step, i) => (
              <li key={step.t}>
                <Reveal delay={i * 120} className="h-full">
                  <div className="tilt glass relative h-full rounded-4xl p-7">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 text-xl font-black text-on-brand shadow-[0_18px_40px_-20px_rgba(255,107,26,1)]">
                      {formatNumber(i + 1, locale)}
                    </div>
                    <h3 className="mt-6 text-xl font-black">{step.t}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{step.d}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- plans ---------------- */}
      {packages.length ? (
        <section className="cv-auto relative overflow-hidden py-24">
          <div className="mesh" aria-hidden="true" />
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
                  {copy.plans.viewAll}
                  <Arrow />
                </LinkButton>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ---------------- cafes ---------------- */}
      {cafes.length ? (
        <section className="cv-auto mx-auto max-w-7xl px-4 py-24">
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
                {copy.cafes.viewAll}
                <Arrow />
              </LinkButton>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* ---------------- partner CTA ---------------- */}
      <section className="cv-auto mx-auto max-w-7xl px-4 py-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-ink to-ink/85 p-8 text-bg sm:p-14">
            <div aria-hidden="true" className="absolute -end-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(255,107,26,0.45),transparent)]" />
            <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="t-title text-3xl font-black sm:text-4xl">{copy.cta.title}</h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed opacity-85">{copy.cta.desc}</p>
                <Link
                  href={`/${locale}/partner`}
                  className="press mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand2 px-8 text-base font-bold text-on-brand hover:-translate-y-0.5"
                >
                  {copy.cta.action}
                  <Arrow />
                </Link>
              </div>
              {/* A sample, not data: labelled as such for everyone. */}
              <figure role="img" aria-label={copy.cta.sample} className="m-0 rounded-3xl border border-white/15 bg-white/5 p-5">
                <figcaption className="text-xs font-bold opacity-80">{copy.cta.sample}</figcaption>
                <div aria-hidden="true" className="mt-4 flex h-28 items-end gap-2">
                  {[35, 52, 44, 78, 61, 92, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand to-brand2" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </figure>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- faq ---------------- */}
      <section className="cv-auto mx-auto max-w-3xl px-4 py-24">
        <Reveal>
          <SectionTitle title={copy.faq.title} />
        </Reveal>
        <div className="mt-10 grid gap-3">
          {copy.faq.items.map((item, i) => (
            <Reveal key={item.q} delay={i * 70}>
              <details className="glass group rounded-3xl p-5 open:ring-1 open:ring-brand/30">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl text-base font-black">
                  {item.q}
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 text-brand-ink transition-transform duration-200 group-open:rotate-45">
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
