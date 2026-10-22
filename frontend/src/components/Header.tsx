"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const trigger = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change closes the menu; the new page owns focus, so it is not moved here.
  useEffect(() => setOpen(false), [pathname]);

  // While open: lock background scroll, close on Escape and hand focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    // Growing past lg hides the menu and its button: close it, or the page would stay scroll-locked.
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    wide.addEventListener("change", onWide);
    return () => {
      html.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

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
  const accountLabel = user ? copy.nav.app : copy.nav.login;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 py-3">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative isolate flex items-center justify-between gap-3 rounded-full px-3 py-2">
            {/* The glass is its own layer so scrolling only fades its opacity: no layout change, no repaint of the
                content. Hidden at the top (visibility flips after the fade), so the backdrop blur costs nothing there. */}
            <span
              aria-hidden="true"
              className={`glass-blur pointer-events-none absolute inset-0 -z-10 rounded-full transition-[opacity,visibility] duration-300 ${
                scrolled ? "visible opacity-100" : "invisible opacity-0"
              }`}
            />
            <Link href={`/${locale}`} className="group flex items-center gap-2.5 ps-1">
              <CupLogo className="h-9 w-9 transition-transform duration-200 group-hover:scale-110" />
              <span className="leading-none">
                <span className="block text-base font-black">{copy.brand}</span>
                <span className="block text-[11px] font-medium text-muted">{copy.brandSub}</span>
              </span>
            </Link>

            <nav aria-label={copy.nav.main} className="hidden items-center gap-1 lg:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className="press rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface2/70 hover:text-ink aria-[current=page]:text-ink"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={switchHref}
                hrefLang={other}
                lang={other}
                aria-label={`${copy.common.language}: ${other === "fa" ? "فارسی" : "English"}`}
                className="press grid h-11 min-w-11 place-items-center rounded-full border border-line bg-surface2/60 px-3 text-xs font-black hover:border-brand-ink/50"
              >
                {other === "fa" ? "FA" : "EN"}
              </Link>
              <ThemeToggle label={copy.common.theme} />
              <Link
                href={accountHref}
                className="press hidden h-11 items-center rounded-full bg-gradient-to-r from-brand to-brand2 px-5 text-sm font-bold text-on-brand shadow-[0_14px_35px_-16px_rgba(255,107,26,0.95)] hover:-translate-y-0.5 sm:inline-flex"
              >
                {accountLabel}
              </Link>
              <button
                ref={trigger}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? copy.nav.menuClose : copy.nav.menu}
                className="press grid h-11 w-11 place-items-center rounded-full border border-line bg-surface2/60 lg:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Always mounted so enter and exit are the same path (globals.css .menu-*); hidden ones are not focusable. */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "menu-open" : "pointer-events-none"}`}>
        <button
          type="button"
          tabIndex={-1}
          aria-label={copy.common.close}
          onClick={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
          className="menu-scrim scrim absolute inset-0"
        />
        <nav
          id="mobile-menu"
          aria-label={copy.nav.main}
          onClick={() => setOpen(false)}
          // Disclosure, not a modal: tabbing out of the menu closes it instead of leaving focus behind the scrim.
          onBlur={(e) => {
            const to = e.relatedTarget;
            if (to && !e.currentTarget.contains(to) && to !== trigger.current) setOpen(false);
          }}
          className="menu-panel glass-blur absolute inset-x-4 top-[5.25rem] grid gap-1 rounded-3xl p-3"
        >
          {links.map((l, i) => (
            <Link
              key={l.href}
              ref={i === 0 ? firstLink : undefined}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className="press rounded-2xl px-4 py-3.5 text-lg font-bold hover:bg-surface2/70 aria-[current=page]:text-brand-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={accountHref}
            className="press mt-1 rounded-2xl bg-gradient-to-r from-brand to-brand2 px-4 py-3.5 text-center text-lg font-bold text-on-brand"
          >
            {accountLabel}
          </Link>
        </nav>
      </div>
    </>
  );
}
