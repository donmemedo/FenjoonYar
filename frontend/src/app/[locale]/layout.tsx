import type { Metadata, Viewport } from "next";

import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { themeScript } from "@/components/Theme";
import PwaRegister from "@/components/PwaRegister";
import { getCopy, isLocale, locales, type Locale } from "@/lib/i18n";
import "../globals.css";

export const metadata: Metadata = {
  title: "کاپ‌یار | CUPS — یک اشتراک، همه کافه‌های مستقل",
  description:
    "کاپ‌یار: بسته‌های پیش‌پرداخت قهوه برای شبکه کافه‌های مستقل ایران. CUPS Iran — prepaid coffee across independent cafes.",
  manifest: "/manifest.webmanifest",
  applicationName: "CUPS",
  appleWebApp: { capable: true, title: "CUPS", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0807" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fa";
  const copy = getCopy(locale);
  const fontStack =
    locale === "fa"
      ? "'Vazirmatn', 'Plus Jakarta Sans', sans-serif"
      : "'Plus Jakarta Sans', 'Vazirmatn', sans-serif";

  return (
    <html lang={locale} dir={copy.dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300..900&family=Plus+Jakarta+Sans:wght@300..800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ ["--font-app" as string]: fontStack }}>
        <Header locale={locale} />
        <main className="min-h-screen pt-24">{children}</main>
        <Footer locale={locale} />
        <BottomNav locale={locale} />
        <PwaRegister />
      </body>
    </html>
  );
}
