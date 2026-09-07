# Shopify integration readiness — September 7, 2026

Status: **backend preparation completed locally; not connected or production-ready**. Adding credentials alone does not activate this checkpoint. This report separates inspected implementation, reusable preparation, and remaining work.

## 1. What was inspected

- GitHub `ggclegacy/groomed-gent-collective/main`, verified through the GitHub connector at `882f6d6fd22b168e35b8c99d8a400bfef0d52f32` (persistent accounts, protected sessions, resumable onboarding).
- `gentleman-publish`: same base commit, plus existing uncommitted rebrand work. This is the preparation target. All pre-existing changes were retained. The Desktop checkout is older (`ce9203d`) and contains independent uncommitted product work; it was inspected, not edited. `sources/` was untouched.
- Package/lockfile, runtime adapters, account service, account and intelligence schemas, PostgreSQL migration journal/SQL, proxy, domain contracts, product knowledge, existing tests and deployment configuration. README history contains obsolete statements about disconnected accounts; current source takes precedence.
- Earlier `shopify-work/app` checkpoint: transport, webhook receiver, database queue, attribution/ledger SQL, services, tests and documented limits. This was not already merged into current main.

Confirmed stack: Next.js 16.3.4, React 19.2.8, Node 24, TypeScript, Drizzle; Clerk + Neon HTTP PostgreSQL account adapter. Retained Vinext/Cloudflare Sites build and D1/SQLite adapter are separate. `vercel.json` selects Next.js; `.openai/hosting.json` retains D1 configuration without a registered site ID. Actual deployed revision, live provider configuration, database history, store, gateway and installed apps were not inspected remotely. Do not equate source configuration with working production credentials.

Identity: verified Clerk session and verified primary email feed the account service. `account_profiles` supports ordinary members and roles; invitation-only `members` separately records ambassador/barber track, active/suspended status and wholesale eligibility. An account, a role, a Shopify customer and an active ambassador are different records. Existing founder/member authorization and account ownership must remain authoritative.

Commerce in current UI is disconnected domain-contract behavior, not actual sales. Product Studio/Cassius use editorial and researched knowledge, including 18 website-listed product records, not a verified Shopify sellable catalog. No live rates, codes, referral attribution, earnings or payout promises were established by inspection.

## 2. What changed/prepared

Additive files in `gentleman-publish`:

- `lib/commerce/{model,shopify,webhook,worker,service}.ts`: reused the earlier isolated foundation, now colocated with current accounts and tested against the current schema. Includes pinned GraphQL transport, token renewal, HMAC, durable queue, read projections, founder/member service authorization, versioned rules and ledger operations. These are dormant libraries, **not bound to app routes**.
- `lib/commerce/config.ts`: non-network configuration validation. Reports missing/unsafe settings without returning secret values; explicitly never labels configuration as production readiness.
- `.env.commerce.example` and one `.gitignore` exception: empty server credentials and disabled defaults. No real environment files created or read.
- `docs/commerce/prepared/0006_commerce.sql`: candidate additive migration, based on the earlier `0002_commerce.sql`. It is intentionally outside the active migrations folder/journal. Existing `0002` through `0005` must not be replaced. No database migration executed outside disposable local tests.
- `tests/commerce.test.ts` and `tests/commerce-config.test.ts`: earlier commerce behavior tests now apply all current account migrations before the candidate; added configuration safety checks. See `validation.md` for this run's results and `preparation-manifest.json` for provenance.

No UI, authentication, account tables, active migration history, package versions, deployment configuration or existing route behavior was changed. No push, deployment, Shopify installation, remote mutation or payment occurred.

## 3. Recommended production architecture

Keep this Next.js app, Clerk, existing member identities and Neon. Shopify owns products/variants, price, sellable inventory, discounts, checkout, orders, payments and fulfillment. Collective owns editorial product knowledge, ambassador relationships, attribution evidence, commission policy versions and the auditable commission ledger. Keep cash transfers with a deliberate external payout process until its own reconciliation is implemented.

Use GraphQL Admin API **2026-07**, the stable July version appropriate to September 2026; pin webhook schema to the same version and review quarterly. Do not use REST Admin for new work or an unpinned `latest` URL. [Shopify versioning](https://shopify.dev/docs/api/usage/versioning).

For a single store owned by Neil's Shopify organization, use a Dev Dashboard app and server-side client-credentials grant; token renewal is already prepared. Confirm app/store organization membership first. For another organization's store, implement custom distribution and authorization-code OAuth with state validation, exact redirect URI, installation verification, encrypted offline token storage/renewal and uninstall cleanup. Do not force a framework rewrite or switch Clerk login to Shopify merely to authenticate the backend. [Shopify authentication](https://shopify.dev/docs/apps/build/authentication-authorization).

### Routes and services to bind during activation

| Route | Boundary and purpose |
| --- | --- |
| `POST /api/shopify/webhooks` | Public HTTPS transport; raw bytes, bounded body, HMAC, configured shop/topic/version allowlist. No Clerk redirect or browser CSRF requirement. Persist minimized receipt transactionally before returning success. |
| `GET /api/commerce/performance` | Verified Clerk session; derive ambassador from active `members` plus commerce mapping. Never accept browser ownership IDs. Private/no-store. |
| `GET /api/commerce/catalog` | Existing service is active-ambassador-only; keep that scope or explicitly design a separate public sellable catalog. |
| `GET /api/commerce/admin`, founder POST actions | Existing service supports connect, sync, rule/tier/code setup, replay and payout bookkeeping. Use configured founder identity, same-origin bounded JSON, audit and no-store. New account admin role must not silently gain payout authority. |
| `POST /api/commerce-worker` | Independent generated worker credential, constant-time comparison, bounded invocation; scheduler must support POST. Do not wire a GET-only cron directly to it. |
| Future cart/account-link routes | Add only when in-app shopping or customer order history is required; maintain ownership, CSRF, rate limits and verified account linking. |

Route bindings must use `server-only` at the Next.js adapter boundary and Node runtime. Register the commerce member API in Clerk proxy matching; keep webhooks/worker out of interactive protection. Reuse the existing Neon database. Keep the Sites adapter untouched; the prepared PostgreSQL functions are not D1-compatible. The earlier runtime/components in `shopify-work` are reference material, not a drop-in replacement for today's proxy/UI.

### Customer/account and catalog mapping

Key every Shopify projection by canonical shop plus Shopify GraphQL ID. Preserve local product knowledge IDs and create an explicit mapping to Shopify product/variant GIDs; SKU/handle/name are reconciliation hints, not durable identity. Never replace approved claims, research provenance or mastery data with product descriptions.

For an ambassador's self-purchase detection, the prepared schema supports a founder-verified Shopify customer ID on the ambassador record. Do not grant access based on matching email alone. For ordinary accounts, add a separate unique `(shop, customer_gid)` to `account_profiles.user_id` link with verification method/time and audit before exposing personal order history. Guest orders remain unlinked. Handle customer merges/deletions and conflicting links through review; never auto-transfer ownership.

Keep the existing Shopify storefront/checkout as the first commerce experience. If the app later needs its own cart, use Storefront Cart API and the returned `checkoutUrl`; no Admin order creation or obsolete Checkout API. For authenticated buyer features, use Customer Account API OAuth/PKCE to prove Shopify identity while retaining Clerk app identity. Neither Storefront nor Customer Account credentials are needed for this initial backend sync. [Cart API](https://shopify.dev/docs/api/storefront/latest/objects/Cart), [Customer Account API](https://shopify.dev/docs/api/customer/latest).

### Sync, webhook reliability and errors

Initial paginated read backfill: products, variants, minimized customers, basic discounts, orders and Shopify Payments disputes where applicable. Prepared workers persist cursors and use bounded jobs, expiring leases, retries and dead letters. Shopify remains the authority; receipt payloads trigger fresh reads instead of applying delivery amounts blindly. Product deletions become tombstones. Full reconciliation catches missed catalog deletions.

Prepared topics cover order create/paid/update/cancel/edit/delete, refunds, fulfillment, products, inventory, customers, discounts, disputes, uninstall/scopes and privacy. Register app-owned subscriptions only after the endpoint and worker are live. Use the client secret for app-webhook HMAC; do not substitute a separately signed manual Admin notification. Deduplicate durable deliveries by shop/topic/webhook ID; event ID is retained for correlation. Ledger fingerprint uniqueness additionally prevents repeat financial effects. Do not globally deduplicate different topics sharing an event. [Delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries).

Production improvements still needed: adaptive retry delay using Retry-After/GraphQL throttle budget plus jitter, schema/scope capability probes, structured redacted operational errors, regular incremental watermarks with overlap, scheduled full reconciliation, backlog alarms and throughput/load checks. Existing code uses bounded network deadlines and generic durable backoff, rejects partial GraphQL errors/version drift and clears rejected tokens. It does not yet implement these richer operating controls.

Only return 2xx after durable acceptance; return 503 on database failure. Target under Shopify's five-second delivery limit and avoid external API work in the receiver. Monitor queue age/depth, dead jobs, freshness, scope loss and API-version drift. Retain only IDs/routing metadata, not raw addresses or payment payloads. Privacy topics currently become operator-review work; export/redaction/retention fulfillment and alert delivery must be implemented before production intake.

### Ambassador/referral/commission flow

Active invited member → approved ambassador record → immutable commission rule version → date-bounded code mapped to existing Shopify discount → verified order → frozen attribution/rule snapshot → append-only commission adjustment → hold period → reviewed payout reservation → externally confirmed payment record.

Code attribution is implemented in the prepared library. Referral-link/QR/campaign touchpoint storage exists, but capture, cookie/consent rules, expiry/precedence and signed opaque attribution references remain to implement. Browser-supplied ambassador IDs and unsigned cart attributes must never settle attribution. Unknown or competing codes need review; no accidental credit. Customer discounts and barber/backbar offers remain distinct from commission rates and wholesale permission.

Money uses explicit currency and integer minor units. Current policy supports percentage plus hold days and conservative holds for uncertain cases; it is not approved business policy. Refunds/cancellations recalculate cumulative target commission and append deltas, preserving already-paid history and negative carry-forward. Stale order snapshots cannot overwrite newer ones. Database locks serialize financial changes/payout reservations. Test real PostgreSQL concurrency and payment/refund races before relying on this in production.

Confirm eligible products, shipping/tax treatment, gift cards, self-purchases, backbar purchases, currencies, partial captures/refunds, chargebacks, historical start date, tier rules and holding/payment schedules. No rates are seeded. Non-Shopify-Payments disputes, lost-dispute allocation, advanced discount types/deep code pagination, per-product rates and automated payout transfers are not complete.

## 4. Environment and rollout

| Environment | Configuration |
| --- | --- |
| Local | Existing Node 24/Next.js; isolated PostgreSQL/PGlite or Neon development branch and Clerk test instance. Commerce disabled. Tests need no Shopify secrets. For real webhooks use a stable HTTPS tunnel to the development store only. |
| Staging | Separate Shopify test store/app installation, Neon branch, Clerk test keys and worker secret. Stable HTTPS hostname. Ensure deployment protection does not intercept the signed webhook route. No production customer backfill into staging. |
| Production | Verified intended store and app, existing live account database/Clerk instance, production-only worker secret, dedicated HTTPS webhook endpoint, tested scheduler/alerts/backups and restricted database runtime privileges. |

Required names are in `.env.commerce.example`: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `COMMERCE_WORKER_SECRET`; existing account settings `DATABASE_URL`, `GGC_ACCOUNT_PROVIDER=clerk-neon`, `GGC_OWNER_ID`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. New preparation checks also require `GGC_COMMERCE_ENVIRONMENT`, `SHOPIFY_AUTH_MODE=client_credentials`, and `SHOPIFY_SAME_ORGANIZATION_CONFIRMED=true` after verification. `GGC_COMMERCE_ENABLED` defaults false. These checks do not activate dormant libraries.

`GGC_MIGRATION_DATABASE_URL` is migration-runner-only, not a Shopify credential. Generate the independent worker secret locally during deployment setup; Neil does not need to supply one. No secret gets a `NEXT_PUBLIC_` prefix. Configure each host environment separately; never reuse production credentials for preview builds.

Before promoting the candidate migration, verify live migration history and current branch head; assign the next unused migration number and append a journal entry without changing old entries. Test on a backed-up staging branch using the existing migration runner. No destructive down migration of financial history. The candidate's custom SQL/functions are authoritative; do not use Drizzle schema push to reconcile it.

Acceptance: install test app; verify canonical shop and granted scopes; validate all pinned GraphQL queries; create test orders with approved code/refund/cancel/edit flows; exercise duplicate/out-of-order delivery, failed storage, retry/expired lease, token expiry, scope loss/uninstall, two member sessions and payout/refund race; prove privacy fulfillment and recovery. Only then bind production config and launch. Rollback disables intake/reporting/worker as appropriate while preserving receipts and financial history; drain/reconcile after repair.

## 5. What Neil needs to provide next

Provide nonsecret identifiers normally; enter the **client secret directly in the deployment secret settings**, not in this report or a chat message.

| Item | Where to find it | Need |
| --- | --- | --- |
| Canonical `something.myshopify.com` domain | Shopify Admin → Settings → Domains | Required; custom storefront URL alone is insufficient. |
| App/store organization and intended store (test vs live) | Dev Dashboard organization selector and app/store listings; Admin store selector | Required to validate client-credentials eligibility. |
| Dev Dashboard app Client ID | Admin → Settings → Apps → Develop apps → Build apps in Dev Dashboard, or open Dev Dashboard directly → Apps → selected app → Settings | Required, nonsecret identifier. |
| Same app Client secret | Same Dev Dashboard app → Settings | Required server secret; securely configure `SHOPIFY_CLIENT_SECRET`. |
| App installation and approved scopes | Dev Dashboard → app → Versions → scope configuration → Release; app Home → Install app → target store. Approve changed scopes in Admin. | Required installation confirmation, not another token to copy. |
| Gateway, customer-account mode and existing referral app names | Admin → Settings → Payments; Settings → Customer accounts; Settings → Apps | Nonsecret settings needed to avoid duplicating attribution or assuming Shopify Payments. |
| Existing relevant discounts and intended history start | Admin → Discounts; Orders date range; commission terms come from Neil's business policy | Required before attribution/payout activation, not needed to run local preparation. |

Start with `read_products`, `read_orders`, `read_discounts`; add `read_customers` for the prepared minimized mapping and `read_inventory` for its inventory projection. The existing full-sync implementation also queries disputes: grant `read_shopify_payments_disputes` only if Shopify Payments is used, otherwise adapt the worker to the actual gateway before running its full scan. Do not request write scopes for products, orders, discounts, payouts or customer payment methods.

For orders older than 60 days, request `read_all_orders` in addition to `read_orders` only when the chosen history needs it. Confirm the app's protected customer data access for the actual fields; basic customer IDs/order data can still require protection even without addresses. Do not request additional personal fields without need. [Scope requirements](https://shopify.dev/docs/api/usage/access-scopes).

New integrations use Dev Dashboard apps; no new legacy Admin custom-app token is required. Tokens are obtained programmatically. Follow the current [app creation/install guide](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard) and [credential location/authentication guide](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant). The Admin launch label can vary; direct Dev Dashboard access reaches the same app settings.

Not needed now: Shopify password, recovery/2FA codes, a manually copied temporary Admin access token, Storefront token, Customer Account client secret, bank details, payout keys, manual webhook signing secret, or duplicate Clerk/Neon credentials already configured securely.

Access-dependent blockers: app/store confirmation, installation, secret configuration, granted scopes/protected data, pinned-query verification and real test orders/webhooks. Separate engineering/operational blockers: runtime route binding to today's auth, migration promotion, scheduled workers/reconciliation/alarms, privacy fulfillment, referral capture (if used), unsupported financial cases and approved business terms. This report does not represent those as solved by credentials.

## Commission Engine follow-on

The [Collective economics foundation](../economics/README.md) now extends this preparation with configurable tier/acquisition/relationship/mission rules, cash and XP audit events, multi-lane bounties, manual adjustments and scoped position reads. Its separate `0007_economics.sql` candidate follows this candidate without replacing account migration history. Both remain dormant. The follow-on documents the required single-writer cutover: do not activate the basic calculator and expanded engine together for the same orders.
