# Architecture

CUPS Iran (کاپ‌یار) sells prepaid coffee packs that customers redeem at independent cafes with a one-time code.

## System context

```mermaid
flowchart LR
  C[Customer browser / PWA] -->|HTTPS| W[Next.js 15 web<br/>port 3044]
  P[Cafe partner browser] -->|HTTPS| W
  W -->|"/api/* rewrite (same origin)"| A[FastAPI api<br/>port 8000]
  A --> D[(SQLite, WAL mode<br/>volume api_data)]
  A -.->|future| S[SMS provider]
  A -.->|future| G[Payment gateway]
```

- The browser only talks to the Next.js origin. Next proxies `/api/*` to the API over the private compose network, so there is no CORS, no preflight, and no API address baked into the JavaScript.
- Dotted lines are integrations that do not exist yet. In `DEMO_MODE` the API returns the login code itself and credits orders instantly.

## Backend layout (`backend/app`)

| Module | Responsibility |
| --- | --- |
| `config.py` | Environment parsing and startup validation. Refuses weak or default secrets. |
| `db.py` | Engine, SQLite pragmas (WAL, busy timeout, foreign keys), `ensure_schema()` for in-place upgrades, indexes. |
| `models.py` | SQLModel tables. Naive-UTC datetimes through one `utcnow()` helper. |
| `auth.py` | JWT creation and verification, cookie or bearer extraction, token-version revocation, CSRF and Origin checks. |
| `ratelimit.py` | In-process sliding-window limiter and client IP resolution. |
| `middleware.py` | Security headers, cache headers, body-size limit, request id. |
| `observability.py`, `errors.py` | JSON logs, audit events with hashed phone numbers, uniform error body. |
| `jobs.py` | Background loop: expire overdue codes, purge old login codes, trim limiter state. |
| `routers/` | `auth`, `catalog`, `wallet`, `partner`. |
| `schemas.py` | Request models with length and pattern limits. |

## Frontend layout (`frontend/src`)

| Area | Responsibility |
| --- | --- |
| `app/[locale]/` | Pages for fa and en (home, plans, cafes, login, account, partner, privacy, terms). Server components fetch public data with a 60 s revalidate. |
| `components/` | UI building blocks. Client components only where interaction needs them. |
| `lib/api.ts`, `server.ts` | Same-origin API client and server-side data fetching. |
| `lib/useAuth.ts` | One `AuthProvider` for the whole app (a single `/api/auth/me` call). |
| `lib/safe-redirect.ts` | Allow-list for the post-login `next` parameter. |
| `middleware.ts` | Locale redirect and per-request CSP nonce. |
| `public/sw.js` | Service worker: static assets only, offline page, never caches HTML or API. |

## Login and session

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js
  participant A as API
  B->>N: POST /api/auth/request-otp {phone}
  N->>A: proxy
  A-->>B: {sent, ttl_seconds, resend_after_seconds}
  Note over A: 6-digit code, stored as HMAC, 5 tries, 60 s cooldown
  B->>N: POST /api/auth/verify-otp {phone, code}
  N->>A: proxy
  A-->>B: {user} + Set-Cookie cups_session (HttpOnly, SameSite=Lax)
  B->>N: POST /api/orders (cookie + X-Requested-With)
  N->>A: proxy
  A-->>B: order
```

## Redemption (the money path)

```mermaid
sequenceDiagram
  participant U as Customer
  participant A as API
  participant R as Cafe partner
  U->>A: POST /redemptions {drink, cafe_slug}
  A-->>U: 8-digit code + QR, valid 10 min (older pending codes cancelled)
  U->>R: shows code
  R->>A: POST /partner/redemptions/confirm {code}
  Note over A: one transaction: UPDATE redemption WHERE status=pending,<br/>UPDATE creditbatch WHERE cups_used < cups_total.<br/>Rowcount 1 on both, else rollback.
  A-->>R: {ok, drink, settle_toman}
```

## Data model

```mermaid
erDiagram
  USER ||--o{ ORDER : places
  USER ||--o{ CREDITBATCH : owns
  USER ||--o{ REDEMPTION : creates
  PLAN ||--o{ ORDER : "bought as"
  ORDER ||--o| CREDITBATCH : credits
  CAFE ||--o{ REDEMPTION : "settled at"
  CAFE ||--o{ USER : "partner staff"
  USER { int id PK
    string phone UK
    string role
    int cafe_id FK
    int token_version }
  REDEMPTION { int id PK
    string code UK
    string status
    datetime expires_at
    int settle_toman }
  CREDITBATCH { int id PK
    int cups_total
    int cups_used
    datetime expires_at }
  OTPCODE { int id PK
    string phone
    string code_hash
    int attempts
    datetime expires_at }
```

## Deployment

`docker-compose.yml` runs two containers, both non-root, read-only root filesystem, all capabilities dropped, `no-new-privileges`, with memory and process limits. Ports bind to `127.0.0.1` by default. TLS terminates in a reverse proxy in front of the web container (not included); set `COOKIE_SECURE=1`, `ENABLE_HSTS=1` and `TRUSTED_PROXIES` accordingly. See `docs/devops-hardening.md`.

## Known limits (deliberate, with upgrade path)

- SQLite with one API process. Move to PostgreSQL and Redis (rate limiter) before running several workers.
- No SMS provider and no payment gateway yet. Production mode creates `pending` orders and credits nothing until a verified gateway callback exists.
- Settlement uses a fixed average cup price. A real menu-price model is a product decision.
