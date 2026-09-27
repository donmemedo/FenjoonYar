import PlanCard from "@/components/PlanCard";
import Reveal from "@/components/Reveal";
import { SectionTitle } from "@/components/ui";
import { getCopy, isLocale, type Locale } from "@/lib/i18n";
import { getPlans } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function PlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fa";
  const copy = getCopy(locale);
  const plans = await getPlans();

  const groups = [
    { key: "package", title: copy.plans.package },
    { key: "subscription", title: copy.plans.subscription },
    { key: "corporate", title: copy.plans.corporate },
  ] as const;

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="mesh" />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Reveal>
          <SectionTitle eyebrow={copy.nav.plans} title={copy.plans.title} sub={copy.plans.sub} />
        </Reveal>

        {groups.map((group) => {
          const items = plans.filter((p) => p.kind === group.key);
          if (!items.length) return null;
          return (
            <section key={group.key} className="mt-16">
              <h2 className="mb-6 text-xl font-black">
                <span className="me-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
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
