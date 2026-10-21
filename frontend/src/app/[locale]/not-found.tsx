"use client";

import { usePathname } from "next/navigation";

import CupLogo from "@/components/CupLogo";
import { LinkButton } from "@/components/ui";
import { defaultLocale, getCopy, isLocale } from "@/lib/i18n";

// not-found receives no params, so the locale comes from the URL's first segment.
export default function NotFound() {
  const first = usePathname().split("/")[1] ?? "";
  const locale = isLocale(first) ? first : defaultLocale;
  const copy = getCopy(locale);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center">
      <CupLogo className="h-16 w-16 lg:animate-float" animated />
      <p aria-hidden="true" dir="ltr" className="mt-6 text-5xl font-black">404</p>
      <h1 className="t-title mt-2 text-xl font-black">{copy.notFound.title}</h1>
      <p className="mt-3 text-muted">{copy.notFound.desc}</p>
      <LinkButton href={`/${locale}`} size="lg" className="mt-8">
        {copy.notFound.back}
      </LinkButton>
    </div>
  );
}
