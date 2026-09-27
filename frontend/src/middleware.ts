import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "./lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const preferred = request.headers.get("accept-language")?.toLowerCase().includes("en")
    ? "en"
    : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|icons|manifest.webmanifest|sw.js|favicon.ico|.*\\.).*)"],
};
