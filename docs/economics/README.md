# Collective Commission Engine foundation

Prepared locally, September 7, 2026. **Not activated, deployed, or approved economic terms. No transfers.**

## Architecture and inspected baseline

Extends `gentleman-publish` and its unregistered commerce foundation. Inspected all current account migration files (0000–0005), PostgreSQL/member/account schema, commerce candidate 0006, model, services, worker, tests, environment/deployment configuration, and earlier readiness documentation. Existing Clerk identity and active invited `members` → `commerce_ambassadors` mapping remain authoritative. Account role alone grants no economic admin authority. Existing source changes were preserved.

Shopify owns order/product/customer/discount/refund facts. Neon owns economic rules, customer-book attribution, cash/XP awards, audit events and manual payout state. Cassius gets a read-only structured position service; no generated advice or autonomous payout tool exists.

- `lib/economics/model.ts`: domain contracts, editable proposed policy, integer validation, exact half-up basis-point arithmetic, canonical hashes.
- `engine.ts`: deterministic attribution, qualified line revenue, frozen tier/rule snapshots, customer ownership, cumulative commission target/delta calculation, missions, open earning lanes and objective bounties.
- `service.ts`: authenticated-server command boundary, membership-scoped reads, optimistic atomic persistence, manual adjustments/holds/voids, external-payment bookkeeping and position projection.
- `shopify-adapter.ts`: explicit, testable handoff from the existing normalized snapshot plus verified enriched facts. Not attached to worker or routes.
- `prepared/0007_economics.sql`: additive PostgreSQL candidate after the existing commerce candidate. Reuses commerce shops, ambassadors and immutable trigger; adds an overlap guard trigger to the legacy ledger without replacing its functions or changing the active migration journal.

### Domain model

| Entity | Meaning and storage |
| --- | --- |
| Rules | Immutable `(shop, version)`, canonical digest, full JSON document and creator. Historical orders retain the original snapshot and tier. |
| Economic event | Unique `(shop, id)`, command digest, actor, reason, monotonic stream revision, source evidence. Immutable; duplicate IDs with different contents fail. |
| Cash/XP award | Cumulative entitlement for an order component, mission completion, objective or independent correction. Cash minor units and integer XP remain separate fields. |
| Ledger entry | Immutable delta of cash and XP with award key, lane, source event, currency, rule snapshot, evidence and reason. Zero deltas record hold transitions. |
| Customer book | Shop-scoped customer → original acquiring ambassador, source order, acquisition and expiry dates. Persists after refunds for provenance; no silent ownership transfer. |
| Order projection | Latest verified source revision, frozen attribution/rules/tier, qualified revenue and review status. |
| Mission | Versioned time interval, metric, product/SKU filters, lane, target, independent boost, completion bounty and XP. Progress derives from qualifying order/objective facts. |
| Objective | Founder-attested Creator/Field/Network or other lane contribution with evidence/reason and optional cash bounty/XP. No schema rewrite for a new lane. |
| Payment | Reserved/paid/void bookkeeping in projection, fully captured by immutable command events. Paid requires unique external reference. No payment-provider call. |

The shop stream's JSON document is a replaceable materialized projection. Cash and XP deltas, rule versions and commands are append-only SQL rows. Customer/objective/payment facts are auditable through those commands. This deliberately favors a small, testable foundation: a whole-shop optimistic stream is not the final high-volume read/write model. Before large backfills, normalize/index order/book/mission projections and partition contention while preserving event and ledger identities.

## Proposed policy (editable data, not irreversible constants)

The unseeded `proposedRules` document contains Member 15%, Operator 17.5%, Proven 20%, Elite 22.5%, Legacy 25%, at $0/$1,000/$3,000/$7,500/$15,000 qualified USD revenue. Tier selection currently uses lifetime net qualified revenue before the triggering order, plus optional XP requirements. No monthly reset. Refunds affect future qualification but never reprice old orders. Rolling periods, grace periods and earned reputation retention remain policy/implementation decisions before launch.

Proposed hold 30 days; verified click window 30 days; relationship window 365 days (not calendar-month arithmetic); first purchase at full tier rate and later book-only purchases at 5%. Explicit newly referred sales still get the selling ambassador's full rate. No second simultaneous retention commission. All durations, rates, tier thresholds, XP gates, acquisition amount, product exclusions and missions live in the versioned document. Acquisition bounty defaults **zero** until margin approval. No mission is seeded or enabled. Customer discount percentages remain Shopify offer settings and do not determine commission rates.

A changed document MUST have a new version ID. Persisted versions reject changed content. Editing the exported proposal does not seed or activate any database rule. Schema changes are unnecessary for new mission configurations, earning lanes and cash/XP bounties. A fundamentally new reward algorithm still requires a versioned evaluator change; arbitrary executable rules are intentionally unsupported.

## Attribution decision table

| Priority / condition | Decision |
| --- | --- |
| Existing order | Retain original attribution, tier and rule snapshot. Changed source customer/date/purchase identity requires review. |
| Multiple distinct verified active ambassador codes | No credit; `competing_codes`. No fallback to a click or book. |
| Exactly one verified active ambassador code | Code wins over click/QR and book. Multiple codes for the same ambassador are one candidate. |
| No eligible ambassador code; eligible verified link or QR | Latest touch within configured window wins; equal timestamps use stable touch ID ascending. Link and QR have equal priority. Future/expired/unverified touches do not qualify. |
| No code/click; unexpired book and active owner | Book owner gets the order; full configured tier for early purchase ordinal, retention rate afterward. |
| None | Persist unattributed order for review; do not invent a payee. |
| Self referral | Default zero sale/acquisition/boost; hold reason recorded. Configurable hold mode retains calculated entitlement for review. |
| Inactive membership or ambassador | New attribution excludes candidate. Existing attributed updates retain ownership but hold award. Payment commands also check current membership. |

Touchpoints must be resolved from existing `commerce_codes` (including effective dates, offer purpose and shop), `commerce_touchpoints`, and signed opaque server references. `verified: true` is an internal adapter assertion, not browser authorization. Public capture/cookie consent, signed identifier issuance, code lookup and QR generation remain dormant integration work. Unknown discount codes are not automatically ambassador codes. Customer merges, disputed ownership and acquiring orders arriving out of chronology require operator review; book ownership is first accepted verified acquisition, not an inferred email match.

## Calculation decision table

| Fact | Calculation |
| --- | --- |
| Qualified revenue | Sum reconciled line subtotal after allocated discounts minus cumulative line refunds; exclude configured products and gift cards. Tax/shipping are absent from the contract. Negative, fractional, duplicate-line, currency-mismatched or over-refunded inputs fail. |
| Sale | Round half-up `qualified minor units × frozen basis points / 10,000`, using BigInt intermediates. |
| Acquisition | Once for persisted source acquisition order/customer, if remaining qualified revenue is positive. Full disqualification reverses bounty; partial refund retains it. |
| Book purchase | Configured lower rate for later purchase ordinal within relationship window, only when book is the winning attribution source. |
| Mission boost | Independent component on matching product/SKU revenue, inside `[start, end)`, with new-customer/subscription condition where configured. Boosts stack additively. |
| Mission completion | Sum matching net revenue/order/customer/subscription counts or attested objective units; award fixed bounty + separate XP when target met. Falling below threshold reverses completion. Refunds after campaign end still recalculate. |
| Order update/refund/cancellation/lost chargeback | Recalculate cumulative target with original policy; append difference. Cancellation or confirmed whole-order chargeback targets zero. Partial chargebacks need verified allocated line losses; adapter currently blocks unresolved disputes. |
| Hold/review | Entitlement remains visible as held; positive held balances block payout reservation/confirmation. Manual holds persist across refreshes. |
| Manual correction | New independent signed correction award, linked to original award and reason. Future Shopify recalculation cannot silently erase it. |
| Void | Zero original award via reversal and persistent void control. Reinstatement requires separate audited correction. |
| Payment after maturity | Founder may reserve available balance; later record externally confirmed payment with unique reference. Refunds preserve paid history and negative carry. |

Rounding is per reward component, never floating-point money math. All currency arithmetic is checked safe-integer minor units; SQL stores bigint. Read results never combine currencies. A shop policy currently uses one currency; foreign currency orders are rejected until an explicit conversion/multi-program policy exists. Initial awards hold from verified settlement time. An increased order component restarts its hold from the source update time; the entire component remains pending during that conservative fresh hold.

## Reliability and authorization boundaries

Existing commerce receipts continue to deduplicate delivery ID by shop/topic. The new adapter adds a normalized order-content identity independent of webhook topic. Pure order processing rejects stale snapshots and conflicting equal timestamps; repeated equivalent snapshots cannot add money. Semantic order revisions are independent of delivery IDs.

Every write reads a revision, computes deterministic changes, then uses one SQL function to lock the shop, compare revision, insert immutable rules/event/ledger rows and update projection atomically. Revision conflicts retry from fresh state up to four times. Failed inserts roll back the entire function. Rule changes and idempotency conflicts fail closed. SQL function execution is revoked from PUBLIC. Production database runtime privileges and trusted authenticated server contexts must be explicitly provisioned; the migration owner remains trusted. Do not expose arbitrary SQL, Context, `workerAuthenticated`, founder ID, or rules from request JSON. HTTP bindings will need `server-only`, verified Clerk/worker identity, same-origin admin requests and bounded payloads.

`execute` allows order commands only for an authenticated worker or configured founder; all objectives, corrections, holds and payout bookkeeping require the configured founder identity. `readPosition` derives ambassador ID from verified member identity. Cassius should call this scoped read boundary only. Suspensions are also checked at reservation/confirmation. Snapshot projections are not authority to bypass current eligibility.

## Dashboard and Cassius contract

`readPosition`/`economicPosition` return currency, available/pending/held/reserved/paid and net lifetime amounts, mission/relationship earnings, qualified revenue, acquired-customer book, net customer LTV, last purchase time, current tier, next tier and revenue/XP gap, mission progress and payout history. Book LTV includes known customer orders even when a later sale is credited elsewhere. It is bounded by imported history. `replenishmentDueAt` is null until validated product cadence exists; no fabricated replenishment date or AI earnings claim. Cash is not XP; negative cash balances remain visible.

## Exact Shopify activation sequence

1. Decide policy items below; version and review the rule document. Confirm current repository and actual live database migration history.
2. On a disposable Neon staging branch, promote existing commerce candidate then this candidate using next unused migration numbers and append journal entries. Keep original account migrations intact. Provision restricted runtime privileges; rehearse backup/recovery.
3. Choose one economic writer. **Do not run `commerce_apply_order`/old `commerce_payout` alongside this engine for the same orders.** The old worker remains unchanged/dormant. Database guards reject new-engine orders with legacy ledger history and legacy ledger writes for orders already accepted by the new engine. At integration time replace its calculation call with the enriched new adapter. Existing old ledger balances require an explicit audited opening-balance/cutover plan; never copy and double-count them.
4. Extend pinned Shopify GraphQL reads with complete paginated line IDs/product/SKU, discount allocations, tax-exclusive values, cumulative refunds, customer first-order/purchase chronology and subscriptions. Persist settlement history. Resolve code/link/QR evidence from existing shop-scoped mappings; never trust cart claims. `processPreparedOrder` rejects incomplete, held or unreconciled snapshots.
5. Wire verified raw-body webhook receipt and authenticated worker using the prior readiness plan; supply separate test-store credentials and test-only data. Add a trusted dispute adapter for verified partial/whole losses. Resolve customer merge/history/backfill ordering before crediting acquisitions.
6. Bind protected member read and founder command APIs with current Clerk authorization, bounded JSON and audit context. Connect real dashboard components/Cassius reads only after reconciliation; do not present proposed money as already earned.
7. Run real Neon concurrent duplicate/update/refund/reservation races, Shopify test orders/refunds/cancels, scope-loss/retry/lease tests and customer-book/mission scenarios. Implement privacy fulfillment, retention, reconciliation schedules, alerts and gateway-specific dispute handling.
8. Enable production intake only after those gates. Payment transfers remain separately designed and authorized; current commands only record manual external-payment facts.

## Neil's launch decisions

- Margin-approved tier rates/thresholds, qualifying period, grace/demotion rules, and whether XP affects earning tiers or only reputation.
- Acquisition bounty, minimum qualifying purchase, partial-return treatment, and meaning of a new customer across storefront/history.
- Early purchase count, relationship duration, explicit-code override vs shared credit, customer ownership disputes/merges.
- Mission budgets and stacking cap, review evidence, bounty approval standards, excluded products/backbar/self-referral rules and subscription renewals.
- Hold clock (settlement vs fulfillment/return window), currencies, negative-balance recovery, payout frequency/minimums and external bookkeeping controls.
- Program terms, disclosure/tax/payment onboarding and data-retention policy with appropriate professional review.

No credentials, production migrations, public routes, live financial records, deployments or transfers were changed by this foundation.
