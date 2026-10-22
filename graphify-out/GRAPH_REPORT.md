# Graph Report - FenjoonYar  (2026-10-22)

## Corpus Check
- 93 files · ~131,637 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .woff2 2, .example 1)

## Summary
- 844 nodes · 2101 edges · 48 communities (43 shown, 5 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 171 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5509afe5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- conftest.py
- test_ratelimit.py
- package.json
- routers/auth.py
- PartnerView.tsx
- getCopy
- layout.tsx
- wallet.py
- [locale]/page.tsx
- main.py
- test_sessions.py
- test_http.py
- test_confirm.py
- Redemption
- User
- test_otp.py
- test_redemptions.py
- LAST_Report.md: what was done, what was not, what is next
- AccountView.tsx
- verify_otp
- test_input.py
- ui.tsx
- compilerOptions
- test_config.py
- middleware.py
- ApiError
- i18n.ts
- test_audit.py
- pentest_live.py
- Cafe
- test_catalog.py
- کاپ‌یار | CUPS Iran
- db.py
- Architecture
- JsonFormatter
- DevOps and container hardening
- advisory_scan.py
- Role reviews
- Hardening session: handoff
- Performance: before and after
- Threat-intelligence lifecycle
- os
- next.config.ts
- sw.js
- docs/README.md
- pentest-results.md
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `getCopy()` - 51 edges
2. `User` - 48 edges
3. `Redemption` - 39 edges
4. `ApiError` - 30 edges
5. `Cafe` - 30 edges
6. `utcnow()` - 29 edges
7. `localeOf()` - 29 edges
8. `CreditBatch` - 24 edges
9. `next` - 23 edges
10. `OtpCode` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Upgrading an existing deployment` --references--> `ensure_schema()`  [INFERRED]
  docs/devops-hardening.md → backend/app/db.py
- `Tech lead` --references--> `ensure_schema()`  [INFERRED]
  docs/role-reviews.md → backend/app/db.py
- `Blocking (must fix immediately)` --references--> `CreditBatch`  [INFERRED]
  docs/security/audit-report.md → backend/app/models.py
- `Frontend layout (`frontend/src`)` --references--> `AuthProvider()`  [INFERRED]
  docs/architecture.md → frontend/src/lib/useAuth.ts
- `4. Review areas not yet covered` --references--> `useAuth()`  [INFERRED]
  HANDOFF.md → frontend/src/lib/useAuth.ts

## Import Cycles
- None detected.

## Communities (48 total, 5 thin omitted)

### Community 0 - "conftest.py"
Cohesion: 0.06
Nodes (35): bearer(), client(), clock(), customer(), _database(), db(), demo(), FakeClock (+27 more)

### Community 1 - "test_ratelimit.py"
Cohesion: 0.08
Nodes (13): client_ip(), SlidingWindowLimiter, Clock, make(), req(), test_client_ip(), test_client_ip_without_a_peer(), test_keys_are_independent_and_check_records_nothing() (+5 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (36): dependencies, next, qrcode, react, react-dom, devDependencies, tailwindcss, @tailwindcss/postcss (+28 more)

### Community 3 - "routers/auth.py"
Cohesion: 0.12
Nodes (10): current_partner(), get_session(), run(), audit(), enforce(), too_many(), logout(), confirm() (+2 more)

### Community 4 - "PartnerView.tsx"
Cohesion: 0.17
Nodes (26): AccountView(), createCode(), LoginForm(), fail(), onSubmit(), requestCode(), verify(), Feedback (+18 more)

### Community 5 - "getCopy"
Cohesion: 0.14
Nodes (25): AppPage(), generateMetadata(), Props, CafesPage(), generateMetadata(), Props, generateMetadata(), LoginPage() (+17 more)

### Community 6 - "layout.tsx"
Cohesion: 0.13
Nodes (21): generateMetadata(), LocaleLayout(), viewport, BottomNav(), icons, CupLogo(), Footer(), Header() (+13 more)

### Community 7 - "wallet.py"
Cohesion: 0.15
Nodes (18): _in(), iso(), utcnow(), summary(), BuyIn, create_order(), create_redemption(), debit_one_cup() (+10 more)

### Community 8 - "[locale]/page.tsx"
Cohesion: 0.19
Nodes (20): HomePage(), Props, PlansPage(), Props, Counter(), FILLED, HeroVisual(), PlanCard() (+12 more)

### Community 9 - "main.py"
Cohesion: 0.13
Nodes (13): init_db(), maintenance_loop(), run_maintenance(), lifespan(), OtpCode, setup_logging(), test_lifespan_starts_the_job_and_cancels_it_on_shutdown(), test_loop_runs_survives_a_failing_tick_and_cancels_cleanly() (+5 more)

### Community 10 - "test_sessions.py"
Cohesion: 0.11
Nodes (13): create_token(), current_user(), _decode(), forge(), login_native(), test_cookie_auth_rules_for_unsafe_methods(), test_logout_kills_every_old_token(), test_logout_needs_csrf_header_with_cookie_but_not_with_bearer() (+5 more)

### Community 11 - "test_http.py"
Cohesion: 0.11
Nodes (9): create_app(), settings_for(), test_csp_is_skipped_on_docs_in_development_only(), test_docs_and_schema_are_hidden_in_production(), test_hsts_only_in_production_with_secure_cookies(), hsts(), test_public_endpoints_need_no_credentials(), test_ready_checks_the_database() (+1 more)

### Community 12 - "test_confirm.py"
Cohesion: 0.17
Nodes (21): batch_of(), confirm(), test_a_confirmed_code_cannot_be_confirmed_twice(), test_cafe_bound_code_works_only_at_its_own_cafe(), test_code_format_is_validated(), test_concurrent_double_confirm_gives_exactly_one_success(), attempt(), test_confirm_settles_and_debits_one_cup() (+13 more)

### Community 13 - "Redemption"
Cohesion: 0.15
Nodes (10): CreditBatch, Order, Redemption, _clean(), give(), make(), test_demo_mode_order_is_paid_and_credits_a_batch(), test_inactive_plan_is_rejected() (+2 more)

### Community 14 - "User"
Cohesion: 0.16
Nodes (15): User, seed(), columns(), index_names(), legacy_engine(), run_flow_on(), serve_from(), test_a_copy_of_the_real_demo_database_upgrades_and_serves() (+7 more)

### Community 15 - "test_otp.py"
Cohesion: 0.14
Nodes (17): age_otps(), test_a_code_cannot_log_in_twice(), test_a_new_code_kills_the_previous_one(), test_code_dies_after_five_wrong_attempts(), test_code_is_hidden_unless_demo_and_stored_only_as_hmac(), test_code_must_be_six_ascii_digits(), test_cookie_is_secure_when_configured(), test_cooldown_blocks_a_resend_within_60_seconds() (+9 more)

### Community 16 - "test_redemptions.py"
Cohesion: 0.17
Nodes (16): writes(), create(), test_code_comes_from_secrets_and_is_zero_padded(), test_code_is_eight_digits_and_response_shape(), test_collision_is_retried_and_exhaustion_is_a_clean_500(), test_confirmed_at_and_expiry_are_utc_iso(), test_creating_a_code_cancels_the_users_other_pending_codes(), test_detail_is_owner_only_and_needs_eight_ascii_digits() (+8 more)

### Community 17 - "LAST_Report.md: what was done, what was not, what is next"
Cohesion: 0.10
Nodes (15): Acceptance criteria for "done", Automated suites, Browser end-to-end (headless Chrome, run 2026-10-22), Manual checks still worth doing, QA test plan and results, safeNext(), 1. Bottom line, 2. What happened, in order (+7 more)

### Community 18 - "AccountView.tsx"
Cohesion: 0.13
Nodes (16): DRINKS, orderTone, statusTone, QrCode(), api(), API_BASE, ApiError, Bilingual (+8 more)

### Community 19 - "verify_otp"
Cohesion: 0.14
Nodes (12): code_hash(), _fail_login(), me(), PhoneIn, ProfileIn, public_user(), request_otp(), update_me() (+4 more)

### Community 20 - "test_input.py"
Cohesion: 0.13
Nodes (8): patch(), test_catalog_query_params_are_capped(), test_email_is_checked_and_capped_at_254(), test_email_length_boundary(), test_lying_content_length_cannot_smuggle_a_big_body(), test_name_is_stripped_and_capped_at_80(), test_oversize_requests_create_nothing(), test_streamed_body_without_content_length_is_413()

### Community 21 - "ui.tsx"
Cohesion: 0.15
Nodes (13): NotFound(), LinkButton(), Size, sizes, Variant, variants, defaultLocale, isLocale() (+5 more)

### Community 22 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 23 - "test_config.py"
Cohesion: 0.27
Nodes (12): ConfigError, build(), test_cors_origins_are_explicit(), test_demo_mode_logs_a_loud_warning_and_expose_otp_is_gone(), test_development_gets_random_secret_and_a_warning(), test_docs_are_disabled_in_production_only(), test_missing_secret_and_default_env_is_production(), test_numeric_settings_are_validated() (+4 more)

### Community 24 - "middleware.py"
Cohesion: 0.16
Nodes (5): Settings, HardeningMiddleware, send_wrapper(), is_public_catalog(), origin_allowed()

### Community 25 - "ApiError"
Cohesion: 0.21
Nodes (4): ApiError, GuardMiddleware, counting_receive(), log_path()

### Community 26 - "i18n.ts"
Cohesion: 0.22
Nodes (13): art, CafeCard(), CafeExplorer(), Badge(), Cafe, Copy, dictionaries, en (+5 more)

### Community 27 - "test_audit.py"
Cohesion: 0.27
Nodes (11): hash_phone(), events(), test_access_log_uses_the_route_template_not_the_redemption_code(), test_database_errors_never_carry_bound_values(), test_every_partner_confirm_attempt_is_audited(), test_login_is_audited_without_phone_code_or_token(), test_logout_is_audited(), test_orders_and_redemptions_are_audited() (+3 more)

### Community 28 - "pentest_live.py"
Cohesion: 0.16
Nodes (4): b64(), Client, forge(), login()

### Community 29 - "Cafe"
Cohesion: 0.35
Nodes (8): Cafe, Plan, cafe_dict(), get_cafe(), list_cafes(), list_plans(), plan_dict(), stats()

### Community 30 - "test_catalog.py"
Cohesion: 0.23
Nodes (7): slugs(), test_city_filter_matches_persian_and_english_names(), test_filters_combine(), test_inactive_cafes_are_hidden_from_the_list(), test_search_wildcards_are_literal(), test_tag_filter_matches_whole_keys_only(), test_text_search_covers_names_and_areas_case_insensitively()

### Community 31 - "کاپ‌یار | CUPS Iran"
Cohesion: 0.18
Nodes (10): Configuration, Demo accounts (only with `DEMO_MODE=1`), Features, Layout, Mobile, Run it for development, Run it with Docker, Status and known limits (+2 more)

### Community 32 - "db.py"
Cohesion: 0.25
Nodes (4): ensure_schema(), _sqlite_pragmas(), _try(), test_ensure_schema_is_idempotent()

### Community 33 - "Architecture"
Cohesion: 0.22
Nodes (8): Architecture, Data model, Deployment, Frontend layout (`frontend/src`), Known limits (deliberate, with upgrade path), Login and session, Redemption (the money path), System context

### Community 34 - "JsonFormatter"
Cohesion: 0.29
Nodes (4): JsonFormatter, trail(), emit(), test_request_id_is_on_every_log_line()

### Community 35 - "DevOps and container hardening"
Cohesion: 0.25
Nodes (7): Backups and observability, CI pipeline (`.github/workflows/security.yml`), Containers, DevOps and container hardening, Running behind TLS, Secrets and configuration, Upgrading an existing deployment

### Community 36 - "advisory_scan.py"
Cohesion: 0.39
Nodes (3): http(), main(), pinned()

### Community 37 - "Role reviews"
Cohesion: 0.29
Nodes (6): Blue team, Product owner, QA, Red team (defensive summary), Role reviews, Tech lead

### Community 38 - "Hardening session: handoff"
Cohesion: 0.29
Nodes (6): 1. Status, 2. Next steps, in order, 3. Backend fixes to make, 4. Review areas not yet covered, 6. Environment notes, Hardening session: handoff

### Community 39 - "Performance: before and after"
Cohesion: 0.40
Nodes (4): Performance: before and after, Re-measure, Security fixes that also cost less, What changed and why it is faster

### Community 40 - "Threat-intelligence lifecycle"
Cohesion: 0.40
Nodes (4): Limits, Service levels, Snapshot (2026-10-22), Threat-intelligence lifecycle

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): API, nextConfig, securityHeaders

### Community 43 - "sw.js"
Cohesion: 0.67
Nodes (3): cacheFirst(), PRECACHE, store()

## Knowledge Gaps
- **8 isolated node(s):** `react-dom`, `@tailwindcss/postcss`, `@types/node`, `@types/qrcode`, `@types/react` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 312 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture` connect `Architecture` to `wallet.py`?**
  _High betweenness centrality (0.390) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `User` (e.g. with `create_token()` and `current_partner()`) actually correct?**
  _`User` has 30 INFERRED edges - model-reasoned connections that need verification._
- **What connects `react-dom`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `conftest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05731523378582202 - nodes in this community are weakly interconnected._
- **Why does `Backend layout (`backend/app`)` connect `wallet.py` to `db.py`, `Architecture`, `conftest.py`?**
  _High betweenness centrality (0.387) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `Redemption` (e.g. with `run_maintenance()` and `stats()`) actually correct?**
  _`Redemption` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_ratelimit.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08408408408408409 - nodes in this community are weakly interconnected._