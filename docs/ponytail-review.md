# Ponytail review (follow-up backlog)

Result of running the ponytail-review skill over the production code of this branch: **23 findings, about 158 lines removable** (85 if the advisory scanner is kept). **None were applied on purpose**: the code had just been verified end to end (238 tests, 43 live checks, browser run, Docker run), and changing it afterwards would void that evidence for savings of a few lines each.

Decisions on the highest-value items:

| Finding | Decision |
| --- | --- |
| Delete `scripts/advisory_scan.py` (CI already audits) | **Keep.** It adds the CISA known-exploited signal that `pip-audit` and `npm audit` lack, and it is the threat-intelligence deliverable. |
| Remove the CORS middleware (browser only calls the Next origin) | **Defer.** Correct for the web app, but native or Capacitor clients and direct API use may need it; revisit when the mobile app is built. The Origin check stays either way. |
| Remove the background job that stores `expired` | **Defer.** Nothing in the app reads the stored value today, but reports and manual queries benefit from it. |
| Eight unused copy keys in `i18n.ts`, unused `Card`, unused `featured` prop, dead CSS | **Backlog, safe.** Do together with a `tsc --noUnusedLocals` and a visual check. |
| Redundant limiter purge, duplicated constants, small shrinks | **Backlog.** |

---

Full list as produced by the reviewer:

# ponytail-review: FenjoonYar hardening (branch security/hardening-pentest-ux vs 6f90340 + working tree)

Scope: backend/app/**, frontend/src/** (no tests), frontend/public/sw.js, frontend/next.config.ts, scripts/advisory_scan.py.
Format: file:Lline: tag what. replacement. Paths are relative to the repo root. Every item was verified by reading the code and grepping callers.

scripts/advisory_scan.py:L1-73: native: 73-line OSV + CISA KEV scanner; CI already runs `pip-audit -r requirements.txt --strict` and `npm audit --omit=dev --audit-level=high` (.github/workflows/security.yml:42,55). Delete the script (docs/security/threat-intel-lifecycle.md:8,31 and README.md:75 then lose a reference), or keep ~15 lines if the KEV flag matters.
backend/app/main.py:L58-66: yagni: CORSMiddleware (9 lines). docs/api-contract.md:5 says "no CORS and no preflight"; the browser calls only the Next origin (frontend/src/lib/api.ts:2-5, API_BASE = "" in the browser, rewrites in next.config.ts:23) and native clients ignore CORS. Delete it. Origin check stays in GuardMiddleware via cfg.cors_origins and DEV_ORIGIN_RE. Removing it only tightens policy. Also drop tests/test_sessions.py:129-137.
frontend/src/app/[locale]/app/AccountView.tsx:L15,L143-145: shrink: LIFETIME fallback and `active ? ... : LIFETIME` branch; activeTotal is read only inside the `active ?` block (L251) and the API always sends both timestamps (CodeTimer already guards total with Math.max(1, total)). Inline `total={Math.round((Date.parse(active.expires_at) - Date.parse(active.created_at)) / 1000)}`, delete the const and the variable.
backend/app/jobs.py:L20-24,L33,L41: delete: UPDATE that persists status="expired". Nothing reads a stored "expired": GETs derive it (routers/wallet.py:145-147, contract line 38), confirm filters on expires_at (partner.py:50), stats and summary count only "confirmed". Delete the update, the `redemptions_expired` key, and the ix_redemption_status_expires index (db.py:58), which exists only for this query. Keep the OTP purge. Only if nothing outside the app reads redemption.status.
frontend/src/lib/i18n.ts:L40-43,L46,L49,L58,L183,L356-359,L362,L365,L374,L494: delete: 8 copy keys in both locales that no code reads (common.continue, back, cancel, search, cup, save, home; app.at). common.toman and common.cups are used. Delete the 16 lines.
frontend/src/app/globals.css:L3: delete: `@custom-variant dark` has no `dark:` utility anywhere in src (the .dark class only switches CSS variables). Delete 1 line plus the blank.
frontend/src/app/globals.css:L367-369: delete: `.no-scrollbar` is used by no component. Delete the block and its comment.
frontend/src/app/globals.css:L41,L42,L50: delete: theme tokens --color-bg2, --color-surface, --color-focus generate utilities (bg-bg2, bg-surface, text-focus) that nothing uses; the --c-* variables they point at are still used via var(). Delete 3 lines.
frontend/src/app/globals.css:L389-390: shrink: `.menu-open .menu-scrim, .menu-open .menu-panel` in the reduced-motion list are overridden by the next rule (L391-392). Drop those two selectors.
frontend/src/app/globals.css:L400-414: shrink: the prefers-reduced-transparency and prefers-contrast blocks repeat identical .glass/.glass-blur/.scrim declarations. One `@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) { ... }` block, then only the variable overrides and `.mesh, .grid-lines` stay in the contrast block. Same behaviour, 4 fewer lines.
backend/app/ratelimit.py:L72-74,L80-81 + backend/app/jobs.py:L32,L33: yagni: periodic limiter.purge() and __len__ (test-only). _live() already purges at MAX_KEYS (L28-31), so memory is bounded without the job. Delete both methods, the job call and the `limiter_trimmed` key.
frontend/src/components/PlanCard.tsx:L17,L21,L60: yagni: `featured` prop that no caller passes (home and plans pages render <PlanCard plan locale />). `const highlight = plan.popular;`, props become `{ plan, locale }`.
frontend/src/components/ui.tsx:L45-47: delete: `Card` has zero importers and zero `<Card` uses (dead since the MVP). Delete it.
frontend/src/lib/api.ts:L122: delete: `export type Drink` is imported nowhere (AccountView uses its own DRINKS list). Delete it.
frontend/src/lib/api.ts:L23-26: delete: the `auth` option is accepted and ignored "so old call sites compile", and no call site passes `auth:`. `options: RequestInit = {}` and `const { headers: extra, ...rest } = options;`.
frontend/src/lib/api.ts:L37: shrink: `credentials: "same-origin"` is the fetch default. Delete the line.
frontend/src/app/[locale]/page.tsx:L192-198 (+L2): shrink: hand-rolled primary pill link (same classes as ui.tsx LinkButton primary lg). `<LinkButton href={`/${locale}/partner`} size="lg" className="mt-8">{copy.cta.action}<Arrow /></LinkButton>`; the `Link` import becomes unused.
backend/app/observability.py:L36-37,L40: delete: idempotency guard and `_cups_json` marker (with its `type: ignore`). setup_logging() runs once, at the import of app.main, and no test calls it. Delete 3 lines.
backend/app/middleware.py:L17: shrink: SAFE_METHODS is defined again in auth.py:16. Define it once and import it.
backend/app/main.py:L44,L47: shrink: `docs_url` and `redoc_url` kwargs and the `docs` local. FastAPI registers /docs and /redoc only when openapi_url is truthy (fastapi/applications.py:1157,1185), so `openapi_url=None if cfg.is_prod else "/openapi.json"` alone is enough. 2 lines.
backend/app/main.py:L6,L83: shrink: HTTPException import beside ApiError. `raise ApiError(503, "not_ready") from None`, drop the import.
frontend/src/components/Header.tsx:L66-67 + frontend/src/components/BottomNav.tsx:L26-27: shrink: the same "partner ? /partner : /app : /login" ternary twice. One `accountLink(user, locale, copy)` next to useAuth.
frontend/src/components/CafeExplorer.tsx:L16,L18-22: yagni: useDeferredValue and three useMemo for filtering a list of about 12 cafes. Plain consts; drop the two imports and the comment.

## Kept on purpose (not findings)
- GET /plans?kind= and GET /cafes?city=&tag=&q= (catalog.py:39-65): the UI filters client-side, but both are in docs/api-contract.md.
- partner.py:105 `pending_settlement` equals `week_settle`: the contract says the summary shape is unchanged.
- config.py:10 KNOWN_BAD_SECRETS is subsumed by the 32-char minimum (all three entries are under 32 chars), and next.config.ts:5,13-15 HSTS repeats middleware.ts:59 (build-time vs runtime). Both are security controls, so no removal is suggested.
- safe-redirect.ts: L23 overlaps L19, but it is trust-boundary defence in depth.
- GuardMiddleware, ApiError.retry_after, rate limiters, CSRF header, JWT claim checks, OTP lockout, audit hashing, db.ensure_schema legacy upgrades and the demo-partner demotion in seed.py: security or data-protection, never flagged.
- middleware.ts pickLocale (14 lines) replaced a buggy includes("en"); it is bounded input parsing, not bloat.
- Accessibility code (live regions, focus management, aria, skip link, reduced-motion CSS, noscript fallback for .reveal): never flagged.
- ruff F rules pass on backend/app and `tsc --noUnusedLocals --noUnusedParameters` passes: no unused imports or locals remain; the findings above are unused exports, keys, CSS and duplicated logic.

## Count
23 findings: delete 9, shrink 9, yagni 4, native 1 (stdlib 0).
net: -158 lines possible (-85 without the advisory script).
