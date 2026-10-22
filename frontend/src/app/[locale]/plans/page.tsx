import type { Metadata } from "next";

import PlanCard from "@/components/PlanCard";
import Reveal from "@/components/Reveal";
import { SectionTitle } from "@/components/ui";
import { getCopy, localeOf } from "@/lib/i18n";
import { getPlans } from "@/lib/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getCopy(await localeOf(params)).plans.title };
}

export default async function PlansPage({ params }: Props) {
  const locale = await localeOf(params);
  const copy = getCopy(locale);
  const plans = await getPlans();

  const groups = [
    { key: "package", title: copy.plans.package },
    { key: "subscription", title: copy.plans.subscription },
    { key: "corporate", title: copy.plans.corporate },
  ] as const;

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="mesh" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="rise">
          <SectionTitle as="h1" eyebrow={copy.nav.plans} title={copy.plans.title} sub={copy.plans.sub} />
        </div>

        {plans.length === 0 ? (
          <p className="glass mx-auto mt-14 max-w-md rounded-3xl p-10 text-center font-bold text-muted">{copy.common.empty}</p>
        ) : null}

        {groups.map((group) => {
          const items = plans.filter((p) => p.kind === group.key);
          if (!items.length) return null;
          return (
            <section key={group.key} aria-labelledby={`g-${group.key}`} className="mt-16">
              <h2 id={`g-${group.key}`} className="mb-6 text-xl font-black">
                <span aria-hidden="true" className="me-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
                {group.title}
              </h2>
              <div className="grid items-stretch gap-6 md:grid-cols-3">
                {items.map((plan, i) => (
                  <Reveal key={plan.slug} delay={i * 90} className="h-full">
                    <PlanCard plan={plan} locale={locale} />
                  </Reveal>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
