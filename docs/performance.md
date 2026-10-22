# Performance: before and after

Same data in both runs: 8 orders, 120 confirmed redemptions, one customer, one partner. Measured in-process with FastAPI's test client, 60 requests per endpoint.

**Read this first.** The *before* run happened while the machine had a load average above 50 on 4 cores, the *after* run on a quiet machine. Timings are therefore not comparable. **SQL statements per request is load-independent and is the fair metric.**

| Endpoint | SQL per request before | after | p50 before (ms, loaded) | p50 after (ms) | payload before | after |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/plans` | 1.0 | 1.0 | 69.11 | 8.04 | 2160 B | 2160 B |
| `/api/cafes` | 1.0 | 1.0 | 88.1 | 7.53 | 3986 B | 3986 B |
| `/api/stats` | 4.0 | 1.0 | 98.05 | 5.89 | 59 B | 53 B |
| `/api/wallet` | 3.0 | 3.0 | 90.62 | 11.99 | 286 B | 770 B |
| `/api/orders` | 3.0 | 2.0 | 60.59 | 10.03 | 1409 B | 1409 B |
| `/api/redemptions` | 242.0 | 2.0 | 2626.11 | 28.82 | 36133 B | 30522 B |
| `/api/partner/summary` | 3.0 | 5.0 | 203.14 | 77.49 | 1441 B | 1465 B |

## What changed and why it is faster

- **Redemption history (242 to 2 statements):** the old handler loaded the cafe once per row and wrote to the database inside a GET. Now one joined read, no write.
- **Stats (4 to 1):** one statement with scalar subqueries instead of loading every cafe to count cities.
- **Partner summary:** the old code loaded all confirmed rows and filtered in Python. Now SQL aggregates (a few more statements, none grows with row count).
- **SQLite:** WAL mode, busy timeout and composite indexes for the real queries, so readers no longer block the writer.
- **HTTP:** gzip above 500 bytes, `Cache-Control: public, max-age=60` on the four public catalog endpoints, no preflight (same-origin proxy), no `Content-Type` on bodiless requests.
- **Frontend:** self-hosted fonts (no render-blocking request to a third party, which is also unreachable from many networks in Iran), one `/api/auth/me` call per session instead of one per component, `qrcode` loaded on demand, calmer animations that only touch transform and opacity, and `content-visibility` on below-the-fold sections.

## Security fixes that also cost less

- Rate limiting and lockouts are in-process dictionaries, so they add no network hop.
- HMAC of the login code is one hash; the conditional `UPDATE` replaces a read-modify-write round trip.
- Token-version revocation reuses the user row the request already loads.

## Re-measure

```bash
cd backend && .venv/bin/python /path/to/bench/after.py /tmp/bench.db out.json
```

Build output of `next build` (production): each page ships 103 to 120 kB of first-load JavaScript, 103 kB of it shared.
