import type { Metadata } from "next";

import Legal from "@/components/Legal";
import { getCopy, localeOf } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getCopy(await localeOf(params)).legal.terms.title };
}

export default async function TermsPage({ params }: Props) {
  const locale = await localeOf(params);
  return <Legal locale={locale} doc={getCopy(locale).legal.terms} />;
}
