<div dir="rtl">

# کاپ‌یار | CUPS Iran

پلتفرم اشتراک و پیش‌فروش قهوه برای شبکه کافه‌های مستقل.

</div>

**CUPS Iran (کاپ‌یار)** sells prepaid coffee packs and subscriptions that customers redeem at independent cafes. A customer buys a pack, creates a one-time 8-digit code (and QR) at the counter, and the cafe confirms it in its own panel (پیش‌خوان کافه).

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15.5 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · PWA |
| Backend | FastAPI · SQLModel · SQLite (WAL) · HttpOnly-cookie sessions |
| Infra | Docker Compose, hardened containers, GitHub Actions security pipeline |

## Features

- **Bilingual fa/en with full RTL/LTR.** Every route lives under `/fa` or `/en`; Persian digits and Persian UX vocabulary.
- **Light and dark theme**, no flash on load, follows the OS by default; honours reduced motion, reduced transparency and high contrast.
- **Fully responsive** with a mobile bottom bar that respects the safe area.
- **Customer flow:** one-time login code, buy a pack, wallet, 8-digit code and QR with a 10-minute countdown, live status.
- **Cafe panel:** confirm a code, today and weekly cups, settlement totals, 7-day chart.
- **PWA:** installable, offline page, never caches HTML or API responses.

## Run it with Docker

```bash
cp .env.example .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')|" .env   # compose refuses to start without a secret
# for the demo only, also set DEMO_MODE=1 in .env
docker compose up -d --build
```

Open http://localhost:3044. Ports are bound to `127.0.0.1`. The API is at http://localhost:8044 (its `/docs` is disabled when `ENV=production`, the default).

## Run it for development

```bash
# backend (Python 3.12)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
ENV=development DEMO_MODE=1 .venv/bin/uvicorn app.main:app --reload --port 8044

# frontend, in another terminal
cd frontend && npm ci
npm run dev        # http://localhost:3044, proxies /api to http://127.0.0.1:8044
```

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | none | **Required** in production. At least 32 characters, never a published default. |
| `ENV` | `production` | `development`, `test` or `production`. Production disables `/docs` and enforces strict startup checks. |
| `DEMO_MODE` | `0` | `1` returns login codes in API responses, seeds the demo partner and credits orders for free. Never on a public host. |
| `COOKIE_SECURE` | `0` | `1` once served over HTTPS. |
| `CORS_ORIGINS` | localhost:3044 | Public web origin(s); every unsafe request carries an `Origin` that must be listed. |
| `TRUSTED_PROXIES` | `1` | Entries to trust from the right of `X-Forwarded-For` for per-IP limits. See `docs/devops-hardening.md`. |
| `JWT_TTL_HOURS` | `24` | Session lifetime. |

## Demo accounts (only with `DEMO_MODE=1`)

| Role | Phone | Notes |
| --- | --- | --- |
| Customer | any `09xxxxxxxxx` | created on first login; the code is shown on screen |
| Cafe (partner) | `09120000000` | bound to «کافه نقطه», opens the cafe panel |

Happy path: log in, buy a pack, **ساخت کد مصرف**, copy the 8-digit code, open `/fa/partner` in another browser profile, log in as `09120000000`, confirm the code: the cup leaves the wallet and lands in the cafe's settlement.

## Tests and scans

```bash
cd backend && .venv/bin/python -m pytest -q          # 238 tests
cd frontend && npm run typecheck && npm run test:unit && npm run build
python3 scripts/advisory_scan.py                      # dependency advisories + CISA known-exploited
python3 scripts/pentest_live.py <api-A> <api-B>       # 43 live checks, see docs/security/pentest-results.md
```

## Layout

```
backend/            FastAPI service (app/, tests/, Dockerfile, pinned requirements)
frontend/           Next.js app (src/app, src/components, src/lib, public/)
docs/               architecture, API contract, security, performance, DevOps, QA
scripts/            advisory_scan.py, pentest_live.py
.github/            security workflow and Dependabot config
docker-compose.yml  api + web, hardened
```

## Status and known limits

No SMS provider and no payment gateway are connected yet: with `DEMO_MODE=0` nobody can log in or pay. Privacy and terms pages are drafts that need legal review. SQLite and the in-process rate limiter mean one API process; move to PostgreSQL and Redis before scaling out. See `LAST_Report.md` and `docs/role-reviews.md`.

## Mobile

The web app is an installable PWA. For store builds wrap the same frontend with Capacitor (`npx cap init`, `add android`, `add ios`) against the deployed URL; native clients can use `X-Client: native` to receive a bearer token.
