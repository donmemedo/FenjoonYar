import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, locales, type Locale } from "./lib/i18n";

/** Highest q wins; ties go to the first listed. "fa,en;q=0.5" -> fa, "en-US,fa;q=0.8" -> en. */
function pickLocale(header: string | null): Locale {
  let best: Locale = defaultLocale;
  let bestQ = 0;
  for (const part of (header ?? "").slice(0, 512).split(",")) {
    const [tag, ...params] = part.split(";");
    const lang = tag.trim().toLowerCase().split("-")[0];
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (isLocale(lang) && q > bestQ && q <= 1) {
      best = lang;
      bestQ = q;
    }
  }
  return best;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hsts = process.env.ENABLE_HSTS === "1";

  if (!locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request.headers.get("accept-language"))}${pathname === "/" ? "" : pathname}`;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Vary", "Accept-Language");
    return redirect;
  }

  // Per-request nonce. Next reads the nonce from the request CSP and stamps its own inline
  // scripts; the layout reads x-nonce for the theme script. 'strict-dynamic' lets those load chunks.
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    ...(hsts ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  if (hsts) response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}

export const config = {
  // Pages only: not /api (rewritten to FastAPI), build assets, sw.js, or a path ending in a file
  // extension. Anchored on purpose: unknown locales render real pages (localeOf falls back to fa), so a
  // looser "starts with api" or "has a dot anywhere" rule let /apix/login or /x.y/login skip the CSP.
  // ponytail: /x.y (one dotted segment) still skips; the layout should 404 unknown locales to close it.
  matcher: ["/((?!api(?:/|$)|_next/static/|_next/image(?:/|$)|sw\\.js$|.*\\.[^/]+$).*)"],
};
