# Threat-intelligence lifecycle

A small, repeatable loop that keeps the project's known-vulnerability picture current. It follows the usual six stages.

| Stage | What we do here |
| --- | --- |
| 1. Direction | Protect: customers' phone numbers, the integrity of wallet credit and cafe settlements, and the web tier. Questions we need answered: *which of our exact dependency versions have a published advisory, is any of it exploited in the wild, and is it reachable from our code?* |
| 2. Collection | OSV.dev (aggregates GitHub advisories, PyPI and npm advisories) and the CISA Known Exploited Vulnerabilities catalogue, queried by `scripts/advisory_scan.py`. GitHub Dependabot alerts and the `npm audit` registry feed run in CI. |
| 3. Processing | Pin lists are read from `backend/requirements.txt` and `frontend/package-lock.json` (140 packages including transitive ones). Advisories are matched on exact version and de-duplicated by id. |
| 4. Analysis | Rank by: known-exploited first, then severity, then whether a fixed version exists. Reachability is judged by hand (for example the PyJWT advisories were mostly unreachable because only HS256 with a static key is used). |
| 5. Dissemination | CI fails on a known-exploited hit or a high/critical advisory with a fix. Dependabot opens one pull request per update. Results are summarised in this folder after each audit. |
| 6. Feedback | Each incident or finding updates the regression tests (`backend/tests`, `scripts/pentest_live.py`) and the risks in `LAST_Report.md`. |

## Service levels

| Condition | Fix within |
| --- | --- |
| Known exploited, or critical and reachable | 48 hours |
| High with a fix available | 7 days |
| Medium | 30 days |
| Low, or no fix available | next scheduled upgrade, record the decision |

## Snapshot (2026-10-22)

| | Before this branch | After |
| --- | --- | --- |
| Python pins | 29 advisories (1 critical, 10 high) | 0 |
| npm | 4 vulnerable packages: `next` 15.5.4 (33 advisories including a critical pre-auth RCE), `postcss`, `sharp`, `source-map-js` | 0 (Next 15.5.27 plus overrides for the three transitive packages) |
| Known exploited (CISA KEV) | 0 | 0 |

Run it yourself: `python3 scripts/advisory_scan.py` (add `--json` for machine output). The exit code is 1 when anything needs action.

## Limits

OSV can lag a new disclosure by hours to days. The scanner sees only what is pinned, not what a container base image ships; Trivy in CI covers the images.
