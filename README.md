<div dir="rtl">

# کاپ‌یار | CUPS Iran

پلتفرم اشتراک و پیش‌فروش قهوه برای شبکه کافه‌های مستقل — بر پایه مدل کسب‌وکار CUPS و طرح بومی‌سازی‌شده‌ی این پوشه.

</div>

**CUPS Iran (کاپ‌یار)** — prepaid coffee packs and subscriptions redeemable across a network of independent cafes.
Customers buy a pack of cups, generate a one-time code / QR at the counter, and the cafe confirms it in its own panel.

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · PWA |
| Backend | FastAPI · SQLModel · SQLite · JWT (OTP login) |
| Infra | Docker Compose (api + web) |

## Features

- **Bilingual fa/en with full RTL/LTR** — every route lives under `/fa` or `/en`, the whole layout mirrors, numbers switch to Persian digits.
- **Light / dark theme** — no-flash inline theme script, remembered per device, follows the OS by default.
- **Fully responsive** — desktop nav, mobile sheet menu and an iOS-style bottom bar.
- **Customer flow** — OTP login → buy a pack → cup wallet → generate a 6-digit code + QR (10-minute countdown) → live status as the cafe confirms it.
- **Cafe panel (پیش‌خوان کافه)** — confirm a customer code, today/weekly cups, settlement totals, 7-day chart, recent confirmations.
- **PWA** — manifest, maskable icons, offline app-shell service worker, installable on Android/iOS.

## Run it

### Docker (recommended)

```bash
cp .env.example .env      # set JWT_SECRET for anything public
docker compose up -d --build
```

- Web: http://localhost:3044
- API docs: http://localhost:8044/docs

### Local development

```bash
# backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8044

# frontend
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8044 npm run dev   # http://localhost:3044
```

## Demo accounts

The OTP is **not** sent by SMS in demo mode (`EXPOSE_OTP=1`); the API returns it and the login screen shows it.

| Role | Phone | Notes |
| --- | --- | --- |
| Customer | any `09xxxxxxxxx` | account is created on first login |
| Cafe (partner) | `09120000000` | bound to «کافه نقطه», opens the cafe panel |

Happy path: log in → **بسته‌ها / Plans** → buy the 10-cup pack → **حساب کاربری** → *ساخت کد مصرف* → copy the 6-digit code → open `/fa/partner` in another browser profile, log in as `09120000000`, paste the code → the cup leaves the wallet and lands in the cafe's settlement.

## Layout

```
backend/            FastAPI service
  app/models.py     User, Cafe, Plan, Order, CreditBatch, Redemption
  app/routers/      auth · catalog · wallet · partner
  app/seed.py       12 cafes, 6 plans, demo partner
frontend/
  src/app/[locale]/ home · plans · cafes · login · app · partner
  src/components/   header, bottom nav, cards, QR, reveal animations
  src/lib/i18n.ts   the fa/en dictionary (single source of copy)
  public/           manifest, service worker, icons
docker-compose.yml
```

## API sketch

```
POST /api/auth/request-otp     { phone }            → { dev_code }
POST /api/auth/verify-otp      { phone, code }      → { token, user }
GET  /api/plans | /api/cafes | /api/stats
POST /api/orders               { plan_slug }        → adds a credit batch (90 days)
GET  /api/wallet                                    → cups left, expiry, batches
POST /api/redemptions          { drink, cafe_slug } → 6-digit code, 10 min TTL
POST /api/partner/redemptions/confirm { code }      → consumes one cup, settles the cafe
GET  /api/partner/summary                           → cafe KPIs + 7-day chart
```

## Persian UX writing

Copy follows the Persian UX vocabulary reference (`ورود` / `ثبت‌نام`, `حساب کاربری`, `کیف پول`, `سفارش‌ها` — never `سفارشات`, `رمز یک‌بار مصرف`, `پیامک`, `پیش‌خوان` for the cafe panel, `تحویل شده` for a delivered cup).

## Next steps (mobile)

The web app is already an installable PWA. For store builds the same frontend can be wrapped:
`npx cap init` → `npx cap add android` / `npx cap add ios` (Capacitor) against the deployed URL, giving an APK and an IPA without a second codebase.
