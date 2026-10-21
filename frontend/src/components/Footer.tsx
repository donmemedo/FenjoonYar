import Link from "next/link";

import CupLogo from "@/components/CupLogo";
import { currentYear, getCopy, type Locale } from "@/lib/i18n";

const link = "press rounded-lg py-1 text-muted hover:text-ink";

export default function Footer({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);

  return (
    <footer className="relative mt-24 border-t border-line pb-28 pt-14 sm:pb-14">
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
        <nav aria-label={copy.nav.footer} className="grid content-start gap-2 text-sm font-semibold">
          <Link href={`/${locale}/plans`} className={link}>{copy.nav.plans}</Link>
          <Link href={`/${locale}/cafes`} className={link}>{copy.nav.cafes}</Link>
          <Link href={`/${locale}/partner`} className={link}>{copy.nav.partner}</Link>
        </nav>
        <div className="grid content-start gap-2 text-sm font-semibold">
          <Link href={`/${locale}/privacy`} className={link}>{copy.footer.privacy}</Link>
          <Link href={`/${locale}/terms`} className={link}>{copy.footer.terms}</Link>
          <p className="mt-2 text-muted">{currentYear(locale)} © {copy.brand} — {copy.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
