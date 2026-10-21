// Post-login `?next=` guard. Only same-origin paths inside a locale are allowed, so the value
// can go to router.push() without opening a redirect or a javascript: sink.

const LOCALE_PATH = /^\/(?:fa|en)(?:[/?#]|$)/;
// Whitespace, control chars, zero-width/bidi marks (parsers strip or ignore them) and backslash.
const BAD_CHARS = /[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff\\]/;
// Encoded slash, dot or backslash: used to smuggle `//` or `..` past a naive prefix check.
const BAD_ESCAPES = /%(?:2f|2e|5c)/i;
const ORIGIN = "http://safe-redirect.invalid";

/** Returns `raw` when it is a safe in-app path, else `fallback`. */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  if (BAD_CHARS.test(raw) || BAD_ESCAPES.test(raw) || !LOCALE_PATH.test(raw)) return fallback;
  try {
    if (BAD_CHARS.test(decodeURIComponent(raw))) return fallback; // %0a, %20, %00 ...
    // The URL parser has the final say on origin and on dot segments.
    const u = new URL(raw, ORIGIN);
    if (u.origin !== ORIGIN || !LOCALE_PATH.test(u.pathname) || u.pathname.includes("//")) return fallback;
  } catch {
    return fallback; // malformed escape or unparsable URL
  }
  if (raw.split(/[?#]/, 1)[0].includes("//")) return fallback;
  return raw;
}
