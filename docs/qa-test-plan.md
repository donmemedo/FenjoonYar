# QA test plan and results

## Automated suites

| Suite | Command | Count | Covers |
| --- | --- | --- | --- |
| Backend unit and API | `cd backend && .venv/bin/python -m pytest -q` | 238 | `test_config` startup refusal; `test_otp` code entropy, lockout, cooldown, single-use under 8 threads; `test_sessions` cookie, bearer, CSRF, Origin, revocation, malformed tokens; `test_orders` demo vs pending, inactive plans; `test_redemptions` unique 8-digit codes, one pending per user; `test_confirm` atomic confirm, concurrency, cafe binding, generic errors, throttle; `test_wallet` expired-cup maths; `test_input` limits and 413; `test_http` headers, cache policy, CORS, docs off; `test_catalog` SQL filters and real stats; `test_db` upgrade of a legacy database and of a copy of the real demo database; `test_jobs` expiry and purge; `test_ratelimit`; `test_audit` no secrets or codes in logs |
| Frontend unit | `cd frontend && npm run test:unit` | 49 | `safeNext` allow-list with hostile and legitimate redirect targets |
| Type check | `cd frontend && npm run typecheck` | clean | strict TypeScript over the whole app |
| Live API checks | `python3 scripts/pentest_live.py A B` | 43 | see `docs/security/pentest-results.md` |
| Production build | `cd frontend && npm run build` | ok | all routes compile; 103 to 120 kB first-load JS |
| Dependency scan | `python3 scripts/advisory_scan.py` | 0 advisories | 140 pinned packages |

## Browser end-to-end (headless Chrome, run 2026-10-22)

Login form with a phone number, code step, landing on `/fa/app`, session cookie not readable by scripts, no token in `localStorage`, plan purchase, credited wallet, "create code" shows a grouped 8-digit code with a countdown, zero console errors or exceptions (the only console line is the expected 401 of the anonymous session check). CSP: every script carries the per-request nonce and no violation was reported. Screenshots: `docs/screenshots/`.

## Manual checks still worth doing

| Area | What to try |
| --- | --- |
| Accessibility | Tab through login, account and partner forms; screen reader on the countdown (should announce each minute, not each second); `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more` |
| RTL and numbers | Persian digits everywhere in `fa`; codes and phone numbers stay LTR; no letter-spacing inside Persian text |
| Mobile | iOS Safari bottom bar and safe area; Android PWA install; offline page after toggling airplane mode |
| Time | Code expiry at 10 minutes; resend cooldown at 60 seconds; login code expiry at 3 minutes; cups expiring at the plan's validity |
| Data | Upgrade an old `cups.db`: login still works, cups preserved, demo partner demoted when `DEMO_MODE=0` |
| Exploratory | Two browsers, one customer and one partner, swap networks mid-flow; double-tap "confirm"; clock skew on the phone |

## Acceptance criteria for "done"

1. All automated suites above are green in CI.
2. `docker compose up -d --build` reaches healthy on both services with `JWT_SECRET` set.
3. The demo path works with `DEMO_MODE=1`: log in, buy a pack, create a code, confirm it as the demo partner, wallet drops by one.
4. With `DEMO_MODE=0`: no login code in any response, orders stay `pending`, docs endpoints return 404.
