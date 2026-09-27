"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import CupLogo from "@/components/CupLogo";
import { ThemeToggle } from "@/components/Theme";
import { getCopy, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

export default function Header({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const pathname = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const other: Locale = locale === "fa" ? "en" : "fa";
  const rest = pathname.split("/").slice(2).join("/");
  const switchHref = `/${other}${rest ? `/${rest}` : ""}`;

  const links = [
    { href: `/${locale}/plans`, label: copy.nav.plans },
    { href: `/${locale}/cafes`, label: copy.nav.cafes },
    { href: `/${locale}#how`, label: copy.nav.how },
    { href: `/${locale}/partner`, label: copy.nav.partner },
  ];

  const accountHref = user ? (user.role === "partner" ? `/${locale}/partner` : `/${locale}/app`) : `/${locale}/login`;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div
            className={`flex items-center justify-between gap-3 rounded-full px-3 py-2 transition-all duration-500 ${
              scrolled ? "glass" : "border border-transparent"
            }`}
          >
            <Link href={`/${locale}`} className="group flex items-center gap-2.5 ps-1">
              <CupLogo className="h-9 w-9 transition group-hover:scale-110" />
              <span className="leading-none">
                <span className="block text-base font-black tracking-tight">{copy.brand}</span>
                <span className="block text-[10px] font-medium text-muted">{copy.brandSub}</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="relative rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface2/70 hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={switchHref}
                className="grid h-10 min-w-10 place-items-center rounded-full border border-line bg-surface2/60 px-3 text-xs font-black transition hover:scale-105 hover:ring-2 hover:ring-brand/40"
                aria-label={copy.common.language}
              >
                {other === "fa" ? "FA" : "EN"}
              </Link>
              <ThemeToggle label={copy.common.theme} />
              <Link
                href={accountHref}
                className="hidden h-10 items-center rounded-full bg-gradient-to-r from-brand to-brand2 px-5 text-sm font-bold text-white shadow-[0_14px_35px_-16px_rgba(255,107,26,0.95)] transition hover:-translate-y-0.5 sm:inline-flex"
              >
                {user ? copy.nav.app : copy.nav.login}
              </Link>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="menu"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface2/60 lg:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-bg/80 backdrop-blur-xl" onClick={() => setOpen(false)} aria-label={copy.common.close} />
          <nav className="absolute inset-x-4 top-24 grid gap-2 rounded-3xl p-4 glass">
            {links.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-2xl px-4 py-3.5 text-lg font-bold transition hover:bg-surface2/70"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={accountHref}
              className="mt-1 rounded-2xl bg-gradient-to-r from-brand to-brand2 px-4 py-3.5 text-center text-lg font-bold text-white"
            >
              {user ? copy.nav.app : copy.nav.login}
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}
