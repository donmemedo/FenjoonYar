import type { Metadata } from "next";

import { getCopy, localeOf } from "@/lib/i18n";
import PartnerView from "./PartnerView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getCopy(await localeOf(params)).partner.title, robots: { index: false } };
}

export default async function PartnerPage({ params }: Props) {
  return <PartnerView locale={await localeOf(params)} />;
}
