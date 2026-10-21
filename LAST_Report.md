# LAST_Report.md: what was done, what was not, what is next

Branch: `security/hardening-pentest-ux` (local commit only, **not pushed, no PR yet**). Written 2026-10-22 when the usage limit was reached.

## 1. Bottom line

The code changes for the hardening are **written and reviewed by a second model, but not yet verified end to end**.
Backend: 238 pytest tests passed in the reviewer's run. Frontend: the platform unit tests passed (47). Nothing was built in Docker, `next build` was never run, the live security script was never run, and no PR was opened.

## 2. What happened, in order

1. Read `HANDOFF.md` and the memory note. The previous session had changed no code.
2. Loaded the requested skills. `/security-audit` ran as a forked auditor and wrote a full report (6 blocking, 9 important, 11 optional findings, overall risk Critical).
3. Upgraded Next.js 15.5.4 to 15.5.27 (fixes a critical pre-auth RCE advisory). Backend packages were already upgraded in `.venv`.
4. Found that the old backend cannot start on the upgraded `sqlmodel` (naive datetimes are rejected). The rewrite fixes it.
5. Recorded a "before" benchmark on the original code with the old pins (`scripts` not needed; numbers below).
6. Wrote the shared contract `docs/api-contract.md`, then ran three workers in parallel (backend, frontend platform, UI/UX), each followed by an Opus reviewer who fixed defects. The first run was cut off by a usage limit and resumed.
7. Added CI (`.github/workflows/security.yml`, `dependabot.yml`, every action pinned to a commit hash), `scripts/advisory_scan.py` (OSV plus CISA known-exploited feed), and `scripts/pentest_live.py` (black-box checks for a local stack).

## 3. Audit findings and their status

| Finding | Fix written | Verified |
| --- | --- | --- |
| B1 login code returned by default | `DEMO_MODE` gate, off by default | pytest |
| B2 public default JWT secret | refuses to start unless 32+ random chars | pytest |
| B3 4-digit code, no attempt limit | 6 digits, `secrets`, HMAC at rest, 5 tries, cooldown, rate limits | pytest incl. 8-thread race |
| B4 orders credited without payment | `pending` unless `DEMO_MODE`; inactive plans rejected | pytest |
| B5 open redirect via `?next=` | `safeNext` allow-list | 47 node tests |
| B6 Next.js RCE advisory | 15.5.27 | scanner |
| I1 partner confirms any code | pending only, cafe-bound, generic error, brute-force throttle | pytest |
| I2 non-atomic confirm | conditional UPDATEs in one transaction | pytest incl. concurrency |
| I3 14-day irrevocable token | 24 h, token version, logout revokes | pytest |
| I4 token in localStorage | HttpOnly cookie, same-origin proxy, CSRF header and Origin check | pytest only |
| I5 no security headers | API headers plus per-request CSP nonce in Next middleware | not run in a browser |
| I6, I7 no rate limits or input limits | limiter, length limits, 413 | pytest |
| I8 demo partner everywhere | seeded only in `DEMO_MODE`; old DBs are demoted | pytest |
| I9 vulnerable pins | pinned to the upgraded versions | scanner (Python clean) |
| O1 to O11 | most done (docs off in prod, CORS, non-root, `npm ci`, SW, self-hosted fonts, audit log) | partly |

Extra defects the reviewers found and fixed: live redemption codes were written to access logs, DB errors logged bound parameters, a CSP bypass through the middleware matcher, an auth-state race after login, an offline page that failed contrast.

## 4. Performance (before numbers; after numbers not yet measured)

Original code, old pins, 120 confirmed redemptions, machine load average above 50 (timings noisy, SQL counts are not):

| Endpoint | SQL statements per request | p50 |
| --- | --- | --- |
| redemption history | **242** | 2626 ms |
| partner summary | 3 | 203 ms |
| stats | 4 | 98 ms |
| wallet / orders | 3 | 91 / 61 ms |

The rewrite moves these to SQL aggregates, adds composite indexes, WAL mode, gzip, cache headers and a self-hosted font. **Re-run `/tmp/.../scratchpad/bench/baseline.py` against the new code to get the "after" column.**

## 5. Not done (and why)

- **Live security test (`scripts/pentest_live.py`)**: written, never run.
- **Attack-tree document**: the safety classifier stopped the write twice. As instructed I did not switch models; skipped. The audit report covers the same chains.
- **Role reviews (product owner, tech lead, red/blue team, QA agents)**: those agent types belong to another project; not used.
- **Docker build and compose run**, **`next build`**, **browser and screenshot check**: not run (memory, then limit).
- **Three npm advisories remain** (postcss, sharp, source-map-js, all inherited from Next). Fix: add `overrides` in `frontend/package.json`, `npm install`, re-run `python3 scripts/advisory_scan.py`.
- **graphify** and **ponytail-review**: skills were loaded but not run. `graphify-out/` does not exist.
- **docs folder**: only `api-contract.md` and `architecture.md`. Missing: pentest results, performance after, QA plan, threat-intel lifecycle, README rewrite (still mentions `NEXT_PUBLIC_API_URL`).
- **PR and push**: not done.

## 6. Open issues from the reviewers

- **Rate limits behind Next**: the proxy does not set `X-Forwarded-For`, so with `TRUSTED_PROXIES=1` and nothing in front of web, the header is client-written. Put a real reverse proxy in front, or have middleware write the header. Test A17 in `pentest_live.py` checks this.
- `CORS_ORIGINS` must list the public web origin or every same-origin POST gets `403 bad_origin`.
- Existing `api_data` volumes are root-owned; the non-root image needs a one-time `chown 10001` of `/srv/data`.
- Unverified at runtime: CSP nonce with `strict-dynamic`, service worker, standalone image, healthchecks, dark-mode contrast, screen readers.
- Legal pages are drafts. With `DEMO_MODE=0` nobody can log in or pay until an SMS provider and payment gateway exist.
- Local `.env` still has the weak default secret; generate one before running compose (`JWT_SECRET` is now required).
- Do not commit `frontend/tsconfig.tsbuildinfo` or `skills-lock.json`.

## 7. Next steps, in order

1. `cd backend && .venv/bin/python -m pytest -q`
2. Add npm overrides, `npm install`, `npm run typecheck && npm run test:unit && npm run build` in `frontend/`.
3. Make a real `.env` (`JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")`, `DEMO_MODE=1` for the demo), `docker compose up -d --build`, open http://127.0.0.1:3044.
4. Start two local API instances and run `python3 scripts/pentest_live.py <prod-like url> <demo url>`.
5. Re-run the benchmark; fill the "after" column; finish the docs and README.
6. `graphify update .`, run `/ponytail-review` on the diff, then push and open the PR.

## 8. Memory

`~/.claude/projects/.../memory/hardening-handoff.md` is out of date: code now exists and the status above supersedes `HANDOFF.md`.
