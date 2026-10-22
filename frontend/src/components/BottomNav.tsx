"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getCopy, type Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

const icons = {
  home: "M4 11.5 12 4l8 7.5M6.5 10v9h11v-9",
  plans: "M4 8h16v11H4zM4 8l2-4h12l2 4M10 12h4",
  cafes: "M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z M12 10.5h.01",
  account: "M5 20a7 7 0 0 1 14 0M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
};

export default function BottomNav({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const pathname = usePathname();
  const { user } = useAuth();

  const items = [
    { href: `/${locale}`, label: copy.brand, icon: icons.home, match: [] as string[] },
    { href: `/${locale}/plans`, label: copy.nav.plans, icon: icons.plans, match: [`/${locale}/plans`] },
    { href: `/${locale}/cafes`, label: copy.nav.cafes, icon: icons.cafes, match: [`/${locale}/cafes`] },
    {
      href: user ? (user.role === "partner" ? `/${locale}/partner` : `/${locale}/app`) : `/${locale}/login`,
      label: user ? copy.nav.app : copy.nav.login,
      icon: icons.account,
      match: [`/${locale}/app`, `/${locale}/partner`, `/${locale}/login`],
    },
  ];

  // The home tab is active only on the exact home path; the others also cover their sub-routes.
  const isActive = (item: (typeof items)[number]) =>
    item.match.length === 0
      ? pathname === item.href
      : item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  return (
    // env(safe-area-inset-bottom) keeps the bar clear of the iOS home indicator (viewport-fit=cover).
    <nav
      aria-label={copy.nav.tabs}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden"
    >
      <div className="glass-blur flex items-center justify-around rounded-3xl px-2 py-1.5">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`press flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1 text-[11px] font-bold ${
                active ? "text-brand-ink" : "text-muted"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
