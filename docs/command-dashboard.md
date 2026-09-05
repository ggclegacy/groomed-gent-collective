# Ambassador Command Dashboard

Home now presents earnings and Cassius as its primary working surfaces, followed by command actions, a personal monthly goal, Collective resources, and restrained performance intelligence. The existing hash routes, Product Studio, Creator Studio editor/library, member access and sourced Cassius workspace are preserved.

## Architecture

- `components/command-dashboard.tsx`: responsive Home, period selection, opt-in sample, goal controls, loading/error/empty/partial/populated states and Growth Move requests.
- `app/command-dashboard.css`: scoped obsidian, forest-glass and gold materials, mobile layout, accessible focus and reduced motion.
- `lib/dashboard/model.ts`: typed dashboard extension of existing `Performance`, `Money`, `Ambassador`, and `Section` contracts; deterministic recommendations, money comparison and targeted pulse selection.
- `lib/dashboard/service.ts`: server provider boundary. It returns honest disconnected commerce and real workspace resources. Future authenticated adapters replace this provider, not the UI.
- `lib/dashboard/validate.ts`: validates financial responses and internal action destinations before rendering.
- `lib/dashboard/sample.ts`: explicitly selected illustrative performance; never passed to the AI as account data. Uses the existing `ggc-barbers-blend-grooming-oil` knowledge ID.
- `app/api/dashboard/route.ts`: period-aware, private/no-store dashboard read.
- `app/api/dashboard/move/route.ts`: loads dashboard context on the server and reuses Cassius’s existing handler, OpenAI configuration, evidence boundaries, timeout and shared process limiter. No client-supplied ambassador ID or financial payload is accepted.
- `components/collective.tsx` and `components/workspaces.tsx`: route-aware in-memory briefs. Creator drafts are not replaced, saved, or published by a dashboard action. Cassius questions are prefilled for review.

## What is real and what is pending

The Home workflow, navigation, local profile greeting, local USD goal, existing studio access and server AI request path are implemented. The public root remains a membership preview. Sample data is opt-in and visibly marked. The default view shows unknown earnings as dashes; no commission rate, reward, tier, payout date, campaign or customer offer is fabricated. Product Studio remains its existing concept-based experience. Pulse entries are currently workspace resources, not claims about company announcements.

Generative answers require the existing `OPENAI_API_KEY` and optional `CASSIUS_OPENAI_MODEL` configuration. No credentials were added. An unconfigured endpoint returns a recoverable error and the foundation action remains usable. Sample mode does not make an OpenAI request. The selected action comes from the typed recommendation service; Cassius explains its server-supplied context rather than emitting executable URLs.

Personal goals use `ggc.preview.dashboard-goal.v1`, are device-local, and are not authoritative account targets. Goal progress uses the monthly earnings view only; the other periods explicitly ask the user to select Month. Tier thresholds, when provided, must use the same qualifying sales period and currency as the dashboard revenue.

## Highest-value integrations

1. Production member identity and an authorized dashboard provider; derive ownership from the server session before returning any private financial data.
2. Signed, idempotent Shopify order/refund events, referral attribution, and an auditable commission ledger. Provide explicit period-earned and available balances rather than inferring them from historical paid totals.
3. Approved payout schedules, tier qualification policies and actual benefits.
4. A governed announcement/campaign/asset feed with eligibility, activation/expiry dates and canonical IDs.
5. Product/channel/content attribution and account-backed goals, then richer recommendation ranking using seasonality, assets and content history.

No infrastructure was changed or deployment performed.

## Validation — September 5, 2026

- Application lint: passed, including the new component and dashboard modules.
- Typecheck: passed.
- All 77 tests: passed (7 dashboard tests added; existing account, studio, Product Studio, Cassius, grooming and health tests preserved).
- Production build: passed with `npm run build -- --webpack`. The default Turbopack production build repeatedly hit this environment’s CSS-worker port-binding restriction (`Operation not permitted`); no build configuration was changed to hide it.
- Full-project lint: the same 20 existing scaffold/hook/index-script findings remain outside this work.
- Browser checks at 1440×1000 and 390×844: earnings and sample states, period switching, responsive layout, no horizontal overflow, goal save and navigation persistence, contextual Creator Studio brief with an existing draft preserved, and prefilled Cassius reasoning question.
- Cassius’s unconfigured response was verified in the browser; the action remains available. Provider success and server context were tested with an injected test response, not a live paid model call.
- Development page and dashboard API render successfully; invalid periods are rejected. Existing member routes remain in the production build.

The implementation was prepared against a local source copy so concurrent knowledge work could be preserved, then installed into the original app with a hash-checked file manifest. Synced `sources/` files were not modified. No deployment, push, database migration, or environment-variable change was performed.
