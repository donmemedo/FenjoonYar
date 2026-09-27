import CafeExplorer from "@/components/CafeExplorer";
import Reveal from "@/components/Reveal";
import { SectionTitle } from "@/components/ui";
import { getCopy, isLocale, type Locale } from "@/lib/i18n";
import { getCafes } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function CafesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fa";
  const copy = getCopy(locale);
  const cafes = await getCafes();

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="mesh" />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Reveal>
          <SectionTitle eyebrow={copy.nav.cafes} title={copy.cafes.title} sub={copy.cafes.sub} center={false} />
        </Reveal>
        <CafeExplorer cafes={cafes} locale={locale} />
      </div>
    </div>
  );
}
