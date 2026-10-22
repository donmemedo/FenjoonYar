# Role reviews

Written from each role's point of view after the hardening pass. The agent personas in this environment were set up for another project, so these reviews were done directly against this codebase.

## Product owner

- **Value:** the one-code redemption flow is the product; everything else supports it. The flow now survives abuse (limits, atomic confirm), which protects the cafes' trust, the scarcest asset.
- **Decision needed, payments:** with `DEMO_MODE=0` orders stay `pending` and nothing credits cups. The product cannot sell until a payment gateway callback is built. This is the main gap between "demo" and "business".
- **Decision needed, SMS:** no SMS provider is connected, so nobody can log in with demo off.
- **Honesty:** the old API added 9,400 members and 128,500 cups to the public numbers. Removed. The home page now shows real, small numbers and hides a tile at zero. Decide whether to show projections, clearly labelled.
- **Settlement:** a fixed average cup price (89,000 toman at 72%) is used. A cafe-specific price list is the next product question.
- **Legal:** privacy and terms pages are drafts with open brackets (retention, deletion contact, refunds, liability, governing law). They need counsel before launch.
- **Scope kept small:** no new features were added during hardening.

## Tech lead

- **Architecture:** modular monolith, one API process, SQLite in WAL mode. Good for a pilot. Move to PostgreSQL and Redis (shared rate limiter) before a second API process; the limiter is deliberately in-process (`ponytail:` comments mark each such limit).
- **Same-origin proxy:** the browser talks only to Next, which removes CORS and preflights and stops the API address leaking into JavaScript. The cost is that the client IP must be passed on correctly (see `docs/devops-hardening.md`).
- **Sessions:** HttpOnly cookie plus token version gives real logout. Native apps get a bearer token through `X-Client: native`, which is the path for the planned APK and IPA.
- **Migrations:** `ensure_schema()` is enough for additive changes. Adopt Alembic before the first destructive change.
- **Debt recorded:** low-severity check-then-insert races on the OTP cooldown and the partner failure limiter; `GET /cafes/{slug}` and redemption creation do not filter inactive cafes; the web client does not use the native token path.
- **Dependencies:** all pinned exactly, 0 known advisories, weekly Dependabot and a weekly CI re-scan.

## Red team (defensive summary)

Scope: the running local stack, black box plus code review. 43 automated checks pass (`docs/security/pentest-results.md`). Classes exercised: authentication and session handling, authorization between customers and between customer and partner, business-logic abuse of orders and codes, concurrency on the money path, input handling, CORS and CSRF, header and cache policy, rate-limit evasion through spoofed forwarding headers, and information leakage in responses and logs.
Residual risks, ranked:
1. Per-IP limits depend on a correctly configured proxy (see DevOps doc).
2. No real SMS or payment provider yet, so the SMS-abuse and payment-fraud surfaces are untested.
3. Browser-side behaviour of the CSP under every Next.js code path was checked on the main pages only.
4. Distributed brute force against 8-digit codes is bounded by one pending code per user, a 10-minute lifetime, and a per-partner failure limit, but a very large partner base would warrant per-cafe anomaly alerts.
An attack-tree write-up was skipped; the audit report covers the same chains.

## Blue team

- **Prevent:** strong-secret enforcement, rate limits, atomic conditional updates, strict input models, CSP with nonce, HttpOnly cookies, non-root read-only containers, pinned dependencies.
- **Detect:** structured audit log with hashed phone numbers; alert on bursts of `rate_limited`, failed logins per phone or IP, and confirm failures per partner. A confirmed-cups-per-partner baseline will reveal fraud.
- **Respond:** rotating `JWT_SECRET` logs everyone out; bumping `token_version` for one user revokes that user; set a cafe user's role back to customer to cut a compromised partner.
- **Recover:** SQLite backups via `VACUUM INTO` (see DevOps doc); test a restore before launch.
- **Fixed during review:** live redemption codes were being written to access logs, and database errors logged bound parameters. Both are covered by regression tests.

## QA

See `docs/qa-test-plan.md`. Hints: test clock-dependent behaviour with a frozen clock (the limiter tests do); always test the money path with two actors and concurrency; check that no response, log line or error page contains a code, token or full phone number; test the legacy-database upgrade with a real copy.
