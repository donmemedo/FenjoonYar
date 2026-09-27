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
    { href: `/${locale}`, label: copy.brand, icon: icons.home },
    { href: `/${locale}/plans`, label: copy.nav.plans, icon: icons.plans },
    { href: `/${locale}/cafes`, label: copy.nav.cafes, icon: icons.cafes },
    {
      href: user ? (user.role === "partner" ? `/${locale}/partner` : `/${locale}/app`) : `/${locale}/login`,
      label: user ? copy.nav.app : copy.nav.login,
      icon: icons.account,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:hidden">
      <div className="glass flex items-center justify-around rounded-3xl px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
