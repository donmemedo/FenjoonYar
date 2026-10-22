import type { Metadata } from "next";
import { Suspense } from "react";

import { getCopy, localeOf } from "@/lib/i18n";
import LoginForm from "./LoginForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getCopy(await localeOf(params)).auth.title, robots: { index: false } };
}

export default async function LoginPage({ params }: Props) {
  const locale = await localeOf(params);
  // useSearchParams (for ?next=) needs a Suspense boundary.
  return (
    <Suspense fallback={<p className="py-32 text-center font-bold text-muted">{getCopy(locale).common.loading}</p>}>
      <LoginForm locale={locale} />
    </Suspense>
  );
}
