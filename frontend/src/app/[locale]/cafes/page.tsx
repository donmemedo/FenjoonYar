import type { Metadata } from "next";

import CafeExplorer from "@/components/CafeExplorer";
import { SectionTitle } from "@/components/ui";
import { getCopy, localeOf } from "@/lib/i18n";
import { getCafes } from "@/lib/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getCopy(await localeOf(params)).cafes.title };
}

export default async function CafesPage({ params }: Props) {
  const locale = await localeOf(params);
  const copy = getCopy(locale);
  const cafes = await getCafes();

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="mesh" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="rise">
          <SectionTitle as="h1" eyebrow={copy.nav.cafes} title={copy.cafes.title} sub={copy.cafes.sub} center={false} />
        </div>
        <CafeExplorer cafes={cafes} locale={locale} />
      </div>
    </div>
  );
}
