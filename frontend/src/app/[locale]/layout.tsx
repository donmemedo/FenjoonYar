import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PwaRegister from "@/components/PwaRegister";
import { themeScript } from "@/components/Theme";
import { getCopy, localeOf } from "@/lib/i18n";
import { jakarta, vazirmatn } from "@/lib/fonts";
import { AuthProvider } from "@/lib/useAuth";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await localeOf(params);
  const copy = getCopy(locale);
  return {
    title: { default: copy.meta.title, template: copy.meta.template },
    description: copy.meta.description,
    manifest: "/manifest.webmanifest",
    applicationName: "CUPS",
    appleWebApp: { capable: true, title: "CUPS", statusBarStyle: "black-translucent" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0807" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// ponytail: reading the per-request CSP nonce makes every page dynamic (no static generation). The
// catalog fetches are still cached 60 s by Next's data cache (lib/server.ts), so a render stays cheap.
// Upgrade path if static pages matter: a hash-based CSP for the one theme script.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await localeOf(params);
  const copy = getCopy(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={locale} dir={copy.dir} className={`${vazirmatn.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint, so there is no light flash in dark mode. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Reveal hides content until scrolled into view; without JavaScript nothing would ever show it. */}
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body>
        <AuthProvider>
          <a href="#main" className="skip-link">{copy.nav.skip}</a>
          <Header locale={locale} />
          <main id="main" tabIndex={-1} className="min-h-dvh pt-24">{children}</main>
          <Footer locale={locale} />
          <BottomNav locale={locale} />
          <PwaRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
