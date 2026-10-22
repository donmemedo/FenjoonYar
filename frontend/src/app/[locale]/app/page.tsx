import type { Metadata } from "next";

import { getCopy, localeOf } from "@/lib/i18n";
import AccountView from "./AccountView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getCopy(await localeOf(params)).app.title, robots: { index: false } };
}

export default async function AppPage({ params }: Props) {
  return <AccountView locale={await localeOf(params)} />;
}
