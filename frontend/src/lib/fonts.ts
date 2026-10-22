import localFont from "next/font/local";

// Self-hosted (public/fonts/README.txt): no render-blocking Google CSS, no third-party IP leak,
// and the CSP can stay `font-src 'self'`. next/font emits the preload link and @font-face.

/** Persian + Latin UI text. */
export const vazirmatn = localFont({
  src: "../../public/fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-vazir",
  fallback: ["Tahoma", "system-ui", "sans-serif"],
});

/** Latin display text (English locale, numerals, headings). */
export const jakarta = localFont({
  src: "../../public/fonts/PlusJakartaSans-Variable.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});
