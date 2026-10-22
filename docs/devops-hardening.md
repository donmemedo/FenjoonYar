# DevOps and container hardening

## Containers

| Control | api | web |
| --- | --- | --- |
| Base image | `python:3.12-slim` | `node:22-alpine`, multi-stage, only the standalone output is copied |
| User | non-root `app` (uid 10001) | non-root `nextjs` (uid 1001) |
| Root filesystem | `read_only: true`, `/tmp` is a 16 MB tmpfs (`noexec,nosuid`), `/srv/data` is the only writable volume | `read_only: true`, tmpfs for `/tmp` and `/app/.next/cache` |
| Capabilities | `cap_drop: [ALL]` | `cap_drop: [ALL]` |
| Privilege escalation | `no-new-privileges` | `no-new-privileges` |
| Limits | 512 MB memory, 128 processes | 768 MB memory, 256 processes |
| Health | `/api/health` every 15 s | `/fa` every 30 s |
| Logs | json-file, 10 MB x 3 | json-file, 10 MB x 3 |
| Install | `pip install -r requirements.txt` with exact pins | `npm ci` only (no fallback to an unlocked install) |
| Ports | `127.0.0.1:8044` | `127.0.0.1:3044` |

Uvicorn runs with `--no-proxy-headers` on purpose: the application reads `X-Forwarded-For` itself and only trusts the entry that `TRUSTED_PROXIES` selects.

## Secrets and configuration

- `docker compose` refuses to start without `JWT_SECRET`. The application refuses to start if it is shorter than 32 characters or equals a known default.
- `.env` is git-ignored. `.env.example` contains no secret values.
- Rotating `JWT_SECRET` logs everyone out and invalidates pending login codes. Nothing else depends on it.
- `DEMO_MODE=1` returns login codes in API responses and credits orders for free. The API logs a warning at startup and `/api/health` reports `"demo": true`. Never enable it on a public host.

## Running behind TLS

The stack does not terminate TLS. Put a reverse proxy in front of the web container, then set `COOKIE_SECURE=1`, `ENABLE_HSTS=1` (rebuild, it is frozen at build time for static headers) and `CORS_ORIGINS=https://your.domain`.
The proxy must **set** (not append to) `X-Forwarded-For` to the peer address, because the per-IP rate limits trust exactly one entry from the right:

```nginx
location / {
  proxy_pass http://127.0.0.1:3044;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Without such a proxy every visitor shares one budget and a client can pick its own bucket. That is the main residual risk of the shipped topology.

## Upgrading an existing deployment

- The old image ran as root, so an existing `api_data` volume is root-owned. The new user cannot write to it. Run once: `docker run --rm -v fenjoonyar_api_data:/d alpine chown -R 10001:10001 /d`.
- The database upgrades itself on start (`ensure_schema()` adds missing columns and indexes). Take a copy first: `docker compose exec api python -c "import sqlite3;sqlite3.connect('data/cups.db').execute(\"VACUUM INTO '/tmp/backup.db'\")"` then `docker cp`.
- A database from the first release contains the demo partner. With `DEMO_MODE=0` that account is demoted to a customer on start.

## CI pipeline (`.github/workflows/security.yml`)

| Job | Tool | Fails the build on |
| --- | --- | --- |
| backend | pytest, bandit, pip-audit | any test failure, medium+ SAST finding, any known advisory |
| frontend | npm audit, tsc, node tests, next build | high+ advisory in production deps, type error, test failure, build failure |
| semgrep | python, typescript, owasp-top-ten, secrets rulesets | any finding |
| secrets | gitleaks over full history | any secret |
| containers | hadolint, trivy (CRITICAL and HIGH, unfixed ignored) | Dockerfile lint error, fixable critical/high CVE |
| codeql | python, javascript-typescript, security-extended | alerts reported to the Security tab |

It runs on every pull request, on pushes to `main`, weekly on Mondays (new advisories against unchanged code), and on demand. Third-party actions are pinned to commit hashes; Dependabot (`.github/dependabot.yml`) proposes updates weekly for pip, npm, both Dockerfiles and the actions themselves.

## Backups and observability

- SQLite is in WAL mode, so a hot copy must use `VACUUM INTO` or the `.backup` command, never `cp` of the main file alone.
- Logs are one JSON object per line with a request id. Audit events (login success and failure, orders, redemptions, every partner confirm attempt, rate-limit hits) hash the phone number and never contain tokens or codes. Alert on spikes of `rate_limited` and failed logins.
- `/api/ready` checks the database and returns 503 on failure; use it for orchestrator readiness.
