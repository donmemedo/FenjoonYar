# LAST_Report.md

Complete report of the hardening, pen-test, performance and UI/UX work on FenjoonYar (CUPS Iran), from the first session to 2026-10-22.
Branch `security/hardening-pentest-ux`, opened as a pull request against `main`.

## 1. Summary

The project had a **Critical** risk rating: anyone could take over any account (public default signing secret, login code returned by the API, 4-digit code with no attempt limit), mint unlimited free cups, and run script through the post-login redirect. The web tier ran a Next.js version with a known pre-auth remote-code-execution advisory.

All blocking and important findings are fixed in code and proven by automated checks. What is **not** done is listed in section 6: real SMS and payment providers do not exist yet, the legal pages are drafts, and the attack-tree document was skipped.

| Evidence | Result |
| --- | --- |
| Backend tests (`pytest`) | 238 passed |
| Live security checks (`scripts/pentest_live.py`, two local API instances) | 43 of 43 passed |
| Frontend type check, unit tests, production build | clean, 49 passed, build ok |
| Dependency advisories (OSV plus CISA known-exploited, 140 packages) | 0 (was 29 Python and 4 npm packages) |
| Docker: `docker compose up -d --build` | both services healthy; non-root, read-only filesystem, no capabilities |
| Real-browser run (headless Chrome) against the Docker stack | login, purchase, code creation: 7 of 7 checks, no console errors |
| Full money path through the web container | buy, create code, cafe confirms, wallet minus one, settlement booked |

## 2. What I did, in order

**Session 1 (previous, interrupted).** Audited authentication and authorization only, upgraded Python packages in `.venv`. No code committed. Left `HANDOFF.md`.

**This session.**
1. Read `HANDOFF.md`, memory and the whole codebase; created branch `security/hardening-pentest-ux`.
2. Ran the `/security-audit` skill as a forked auditor: 6 blocking, 9 important, 11 optional findings, three attack chains, dependency and secret scans (`docs/security/audit-report.md`).
3. Upgraded Next.js 15.5.4 to 15.5.27; later added npm `overrides` for postcss, sharp and source-map-js.
4. Found that the old backend cannot start on the upgraded `sqlmodel` (rejects naive datetimes); fixed in the rewrite.
5. Recorded a "before" benchmark on the original code with the old pins.
6. Wrote the shared contract (`docs/api-contract.md`) and ran three workers in parallel with disjoint file ownership (backend, frontend platform, UI/UX). Each was reviewed by a second model (Opus) that fixed defects. The first run hit a usage limit; I resumed it from its saved state.
7. Re-verified everything myself (section 1), built and ran the Docker stack, took light and dark screenshots, ran the browser tests.
8. Added CI, Dependabot, an advisory scanner, a live security script, documentation, a README rewrite, a code graph, and a ponytail review.

## 3. Findings and fixes

| Finding | Fix | Proof |
| --- | --- | --- |
| B1 login code returned by default | only when `DEMO_MODE=1`; off by default | tests, live A4 |
| B2 public default JWT secret | startup refuses unless 32+ chars and not a known default; compose requires it | tests, live A7/A8 |
| B3 4-digit code, no limit | 6 digits via `secrets`, HMAC at rest, 5 attempts, 60 s cooldown, per-IP and per-phone limits, single use even under 8 threads | tests, live A5/A6/A17 |
| B4 orders paid without payment | `pending` unless demo; inactive plans rejected | tests, live B2 |
| B5 open redirect and script execution via `?next=` | strict allow-list `safeNext` | 49 unit tests |
| B6 Next.js RCE advisory | 15.5.27 | scanner |
| I1, I2 partner confirm weaknesses and race | pending only, cafe-bound, one generic error, throttled, atomic conditional updates | tests, live B12/B13/B15/B17 |
| I3, I4 long, irrevocable, script-readable token | 24 h HttpOnly cookie, token version, real logout, CSRF header and Origin check | tests, live B1/B9/B10/B20/B21, browser |
| I5 no security headers | API headers and a per-request CSP nonce in Next middleware | live A2, headers on built app |
| I6, I7 no rate or size limits | limiter, field limits, 413 | tests, live A11/A12 |
| I8 demo partner everywhere | seeded only in demo; demoted on old databases | tests |
| I9 vulnerable pins | exact upgraded pins | scanner |
| O1 to O11 | docs off in production, explicit CORS, non-root, `npm ci` only, service worker rewritten, self-hosted fonts, audit logging, honest stats | tests and Docker run |

Extra defects the reviewers found and fixed: live redemption codes were written to access logs; database errors logged bound parameters; a middleware matcher gap let some paths skip the CSP; an auth-state race after login; an offline page that failed contrast; reduced-motion rules that did not match some animation classes.

## 4. Performance

SQL statements per request (load-independent, the fair metric). Wall-clock timings are in `docs/performance.md`, with the caveat that the "before" run happened at a machine load above 50.

| Endpoint | Before | After |
| --- | --- | --- |
| Redemption history | 242 | 2 |
| Stats | 4 | 1 |
| Orders | 3 | 2 |
| Wallet | 3 | 3 |
| Partner summary | 3 (loaded all rows in Python) | 5 (SQL aggregates, constant) |

Also: SQLite WAL and composite indexes, gzip, cache headers on public endpoints, same-origin proxy (no preflights), one session call instead of one per component, self-hosted fonts, on-demand QR library, calmer animations. Next build: 103 to 120 kB first-load JavaScript per page.

## 5. UI/UX (apple-design pass)

Instant press feedback, no `transition-all`, calmer infinite animations, support for reduced motion, reduced transparency and high contrast; accessible mobile menu (expanded state, Escape, focus return, scroll lock); safe-area bottom bar; real forms with autocomplete and live regions; progress rings and a countdown that announces each minute, not each second; skip link; no letter-spacing on Persian text; Persian UX vocabulary («پیش‌خوان کافه», «نادرست»); localised 404; privacy and terms pages; honest statistics. Screenshots in `docs/screenshots/` (light and dark, desktop and mobile, fa and en).

## 6. Not done, skipped, or needs your decision

| Item | Why |
| --- | --- |
| **Attack-tree document** | The safety classifier stopped it twice. As you instructed, I did not switch models; skipped. The audit report covers the same chains. |
| **SMS provider and payment gateway** | Do not exist. With `DEMO_MODE=0` nobody can log in or pay. Needs your provider choice. |
| **Legal pages** | Drafts with open brackets; need counsel. |
| **Product owner, tech lead, red team, blue team, QA agents** | The available agent types belong to another project, so I wrote the five reviews myself in `docs/role-reviews.md`. |
| **"Opus 4.8"** | Not an available model. I used Sonnet 5.5 to implement and Opus 5.5 to review, as you asked for a cross-check. |
| **Skills** | The security-audit, graphify, ponytail and apple-design skills were applied directly. `security-auditor`, `security-scanning-security-sast`, `red-team-tools`, `red-team-tactics`, `attack-tree-construction` and the FastAPI, Python and Docker-hardening skills were loaded as guidance but not run as separate passes. Bandit and Semgrep are not installed on this machine; they run in the CI workflow instead. |
| **Ponytail findings** | 23 found (about 158 lines removable); kept as a backlog in `docs/ponytail-review.md`, none applied, to keep the verified code unchanged. |
| **Graph** | Built from code only (844 nodes, 2,101 edges, 48 communities). No docs, papers or images were extracted because that needs a language-model pass. |
| **Old containers** | Two stopped containers (`cups_api`, `cups_web`, with volume `44_cups_api_data`) from your first build in `~/Documents/Darvag/Projects/44_CUPS` still exist. I did not touch them. I removed the fixed `container_name` from compose so they no longer clash. |
| **`.env`** | The old `.env` held the public default secret, which the app now refuses. I replaced it with a freshly generated secret and `DEMO_MODE=1`. It is git-ignored. |

## 7. Risks to know about before going public

1. **Per-IP rate limits need a proxy that sets `X-Forwarded-For`.** The Next.js proxy does not add its own entry. Without a TLS reverse proxy that sets it (config in `docs/devops-hardening.md`), visitors share one budget and a client can choose its own. This is the main residual risk.
2. `CORS_ORIGINS` must list the public web origin, or every same-origin POST gets `403 bad_origin`.
3. Existing `api_data` volumes are root-owned; the non-root image needs a one-time `chown` to uid 10001.
4. SQLite and the in-process limiter mean one API process.
5. A transient network failure on logout leaves the cookie alive while the UI shows logged out.
6. Low-severity races remain on the OTP cooldown and the partner failure counter (bounded by other limits).
7. The anonymous session check logs one expected 401 per page load in the browser console.

## 8. How to run

```bash
cp .env.example .env     # set JWT_SECRET (and DEMO_MODE=1 for the demo)
docker compose up -d --build        # http://localhost:3044
cd backend && .venv/bin/python -m pytest -q
cd frontend && npm run typecheck && npm run test:unit && npm run build
python3 scripts/advisory_scan.py
python3 scripts/pentest_live.py http://127.0.0.1:18201 http://127.0.0.1:18202   # see docs/security/pentest-results.md
```

Demo login: any `09xxxxxxxxx` customer; cafe `09120000000`, with `DEMO_MODE=1`.

## 9. Next steps

1. Pick an SMS provider and a payment gateway; implement the verified payment callback that credits cups.
2. Put a TLS reverse proxy in front and set `COOKIE_SECURE=1`, `ENABLE_HSTS=1`.
3. Legal review of the privacy and terms pages.
4. PostgreSQL and Redis before running more than one API process.
5. Work through `docs/ponytail-review.md`.
6. Build the Capacitor wrappers for APK and IPA (native clients use `X-Client: native`).

## 10. Memory and handoff

`HANDOFF.md` is superseded by this report and was left untracked. The project memory note has been updated to point here.
