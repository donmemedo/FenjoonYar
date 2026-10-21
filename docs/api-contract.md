# API contract (v2, hardened)

Single source of truth shared by the FastAPI backend and the Next.js frontend.
All paths are under `/api`. The browser only ever talks to the Next.js origin;
Next rewrites `/api/*` to the backend, so there is no CORS and no preflight.

## Session model

- Login sets an `HttpOnly` cookie `cups_session` holding a signed JWT. Attributes: `Path=/`, `SameSite=Lax`, `Secure` when `COOKIE_SECURE=1`, `Max-Age` equal to the token lifetime.
- The JWT carries `sub` (user id as string), `tv` (token version), `iat`, `exp`. Lifetime is `JWT_TTL_HOURS` (default 24).
- The API accepts the token from the cookie or from `Authorization: Bearer`. Native clients send `X-Client: native` on `verify-otp` and also receive the token in the JSON body. Web clients never see the token.
- CSRF: any unsafe method (POST, PATCH, PUT, DELETE) authenticated by the cookie must send `X-Requested-With: cups-web`, otherwise `403 csrf`. If an `Origin` header is present and not in `CORS_ORIGINS`, the API answers `403 bad_origin`.
- `POST /api/auth/logout` bumps the user's `token_version` (all tokens die), clears the cookie, returns `204`.

## Error shape

`{"detail": "<code>"}` plus optional `"retry_after": <seconds>` and the `Retry-After` header on `429`.
Codes: `not_authenticated`, `invalid_token`, `user_not_found`, `csrf`, `bad_origin`, `partner_only`, `invalid_code`, `otp_cooldown`, `rate_limited`, `plan_not_found`, `no_cups_left`, `code_invalid`, `not_found`, `payload_too_large`, `internal_error`.
Validation errors are `422` with FastAPI's default body.

## Endpoints

| Method + path | Auth | Request | Response |
| --- | --- | --- | --- |
| `POST /auth/request-otp` | none | `{phone}` pattern `^09\d{9}$` | `{sent, ttl_seconds, resend_after_seconds, dev_code}`. `dev_code` is a string only when `DEMO_MODE=1`, else `null`. `429 otp_cooldown` within 60 s of the previous request. |
| `POST /auth/verify-otp` | none | `{phone, code (6 digits), name?}` | `{user}` and sets the cookie. With `X-Client: native` also `{token}`. `400 invalid_code` for wrong, expired, used or locked codes. |
| `POST /auth/logout` | user | none | `204` |
| `GET /auth/me` | user | none | `{id, phone, name, role, cafe_id}` |
| `PATCH /auth/me` | user | `{name?, email?}` | same as `GET /auth/me` |
| `GET /plans?kind=` | none | `kind` in package, subscription, corporate | list of plans (unchanged shape) |
| `GET /cafes?city=&tag=&q=` | none | `q` max 64 chars | list of cafes (unchanged shape) |
| `GET /cafes/{slug}` | none | none | cafe, or `404 not_found` |
| `GET /stats` | none | none | `{cafes, cities, members, cups_served}` real counts only, no hard-coded offsets |
| `GET /wallet` | user | none | `{cups_remaining, cups_used, cups_expired, total_bought, expiring_soon, next_expiry, batches[]}` |
| `POST /orders` | user | `{plan_slug}` | `{id, cups, amount, status, created_at, plan, payment_required}`. With `DEMO_MODE=1` the order is `paid` and cups are credited at once. Otherwise it is `pending`, `payment_required` is `true` and no cups are credited. Inactive plans give `404 plan_not_found`. |
| `GET /orders` | user | none | list of orders (unchanged shape) |
| `POST /redemptions` | user | `{drink, cafe_slug?}` with drink in espresso, latte, cappuccino, filter, cold | redemption. Creating one cancels the user's other pending codes. `400 no_cups_left` when the wallet is empty. |
| `GET /redemptions` | user | none | list, newest first. Overdue pending items are reported as `expired` without a database write. |
| `GET /redemptions/{code}` | user | code is 8 digits | redemption, or `404 not_found` |
| `POST /partner/redemptions/confirm` | partner | `{code}` 8 digits | `{ok, code, drink, settle_toman, confirmed_at}`. No customer name or phone. `404 code_invalid` for unknown, used, expired or other-cafe codes. `400 no_cups_left`. `429 rate_limited` after 10 failures in 10 minutes. |
| `GET /partner/summary` | partner | none | unchanged shape |
| `GET /health` | none | none | `{status:"ok"}` liveness |
| `GET /ready` | none | none | `{status:"ok"}` after a database check, else `503` |

## Redemption object

`{id, code, drink, status, created_at, expires_at, confirmed_at, cafe, qr_payload}` where `code` is exactly 8 digits and `qr_payload` is `cups://redeem/<code>`.
`status` is `pending | confirmed | expired | cancelled`.

## Caching

Public catalog endpoints (`/plans`, `/cafes`, `/cafes/{slug}`, `/stats`) send `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Everything else sends `Cache-Control: no-store`.
