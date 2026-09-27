import Link from "next/link";

import CupLogo from "@/components/CupLogo";
import { getCopy, type Locale } from "@/lib/i18n";

export default function Footer({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const year = locale === "fa" ? "۱۴۰۵" : "2026";

  return (
    <footer className="relative mt-24 border-t border-line pb-24 pt-14 sm:pb-14">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <CupLogo className="h-10 w-10" />
            <div>
              <p className="text-lg font-black">{copy.brand}</p>
              <p className="text-xs text-muted">{copy.brandSub}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{copy.footer.made}</p>
        </div>
        <div className="grid content-start gap-3 text-sm font-semibold">
          <Link href={`/${locale}/plans`} className="text-muted transition hover:text-brand">{copy.nav.plans}</Link>
          <Link href={`/${locale}/cafes`} className="text-muted transition hover:text-brand">{copy.nav.cafes}</Link>
          <Link href={`/${locale}/partner`} className="text-muted transition hover:text-brand">{copy.nav.partner}</Link>
        </div>
        <div className="grid content-start gap-3 text-sm font-semibold">
          <span className="text-muted">{copy.footer.privacy}</span>
          <span className="text-muted">{copy.footer.terms}</span>
          <span className="text-muted">{year} © {copy.brand} — {copy.footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}
