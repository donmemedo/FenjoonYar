import assert from "node:assert/strict";
import { describe, it } from "node:test";

// @ts-ignore TS5097: `node --test` needs the explicit .ts extension; tsconfig does not enable it.
import { safeNext } from "./safe-redirect.ts";

const FALLBACK = "/fa/app";

describe("safeNext: allowed", () => {
  const ok = [
    "/fa",
    "/en",
    "/fa/",
    "/en/partner",
    "/fa/app",
    "/fa/app?tab=orders",
    "/en/cafes?city=tehran&q=abc",
    "/fa#top",
    "/fa?x=1",
    "/en/plans#pricing",
    "/fa/cafes?q=%D8%A7%D9%84%D9%87", // percent-encoded Persian query
    "/fa/cafes?next=//still-just-a-query",
  ];
  for (const input of ok) {
    it(`keeps ${input}`, () => assert.equal(safeNext(input, FALLBACK), input));
  }
});

describe("safeNext: rejected", () => {
  const hostile: [string, unknown][] = [
    ["protocol-relative", "//evil.com"],
    ["protocol-relative with locale", "//evil.com/fa"],
    ["leading backslash", "/\\evil.com"],
    ["backslash after locale", "/fa/\\evil.com"],
    ["encoded backslash", "/fa/%5Cevil.com"],
    ["encoded backslash lowercase", "/fa/%5cevil.com"],
    ["encoded double slash", "/fa/%2f%2fevil.com"],
    ["encoded double slash at root", "/%2f%2fevil.com"],
    ["encoded dot segments", "/fa/%2e%2e/%2e%2e//evil.com"],
    ["dot segments to //", "/fa/../..//evil.com"],
    ["double slash after locale", "/fa//evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["mixed-case javascript", "JaVaScRiPt:alert(1)"],
    ["data scheme", "data:text/html,<script>alert(1)</script>"],
    ["https absolute", "https://evil.com"],
    ["absolute even when it points at a locale", "http://localhost:3044/fa/app"],
    ["tab inside path", "/fa\t/evil"],
    ["newline then //", "/fa\n//evil.com"],
    ["encoded CRLF", "/fa/%0d%0aSet-Cookie:x=1"],
    ["leading space", " /fa/app"],
    ["trailing space", "/fa/app "],
    ["non-breaking space", "/fa/app\u00a0"],
    ["bidi override", "/fa/\u202eapp"],
    ["zero-width space", "/fa/\u200bapp"],
    ["NUL byte", "/fa\u0000"],
    ["locale prefix lookalike", "/fax"],
    ["uppercase locale", "/FA/app"],
    ["userinfo trick", "/fa@evil.com"],
    ["outside any locale", "/app"],
    ["bare root", "/"],
    ["relative without slash", "app"],
    ["empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["non-string", 42],
    ["malformed percent escape", "/fa/%E0%A4%A"],
    ["oversized input", `/fa/${"a".repeat(3000)}`],
  ];
  for (const [name, input] of hostile) {
    it(`falls back for ${name}`, () => assert.equal(safeNext(input as string, FALLBACK), FALLBACK));
  }
});
