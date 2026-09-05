# Command Dashboard visual rebuild

## Implementation

Home retains its existing dashboard service, authenticated server boundaries, Cassius handler, recommendation selection, hash routes, and Creator/Product Studio handoffs. No provider, dependency, infrastructure, or credential configuration changed.

- `components/command-dashboard.tsx`: spatial earnings hero, Cassius intelligence surface, grouped command launcher, momentum/tier treatment, prioritized pulse, and product/channel intelligence.
- `components/dashboard/primitives.tsx`: reusable glass, metrics, sparkline, ring, ranked bars, feed rows, status chips, and command objects.
- `components/dashboard/performance-chart.tsx`: existing Recharts dependency, themed earnings/sales area chart, prior-period comparison, touch tooltip, keyboard navigation, and exact-value table.
- `app/command-dashboard.css`: scoped obsidian/forest/gold depth system, responsive grids, compact mobile controls, safe-area navigation spacing, focus and reduced-motion treatments. Dashboard CSS is now imported directly by the root layout after global CSS, so its production inclusion is explicit. The existing Creator Studio stylesheet is also imported by the root layout; it previously had no import and rendered unstyled when following the dashboard handoff.
- `lib/dashboard/{model,sample,validate}.ts`: optional comparison/sales history fields and fully labeled sample fixtures with exact financial reconciliation and canonical product IDs. Existing providers remain compatible.

## Data boundaries

Production commerce reporting remains disconnected until its existing adapter is connected. No sample earnings, tier benefits, payout dates, campaigns, or commission claims appear as actual account data. Sample mode is opt-in, explicitly labeled throughout, and uses a dated September 2026 fixture. The monthly sample goal stays monthly when reporting periods change. Product and channel totals reconcile with sample revenue/orders/clicks; chart series reconcile in minor currency units.

Live Cassius requests continue through the existing server-side dashboard move route; sample analysis is explicitly illustrative. This local verification environment has no configured OpenAI credentials, so live provider generation was not verified. Existing fallback actions remain available.

## Validation

- App lint and typecheck passed.
- All 93 tests passed, including sample totals/time bounds, canonical product identity, and malformed optional data coverage.
- Next.js production build passed with Webpack (`npm run build -- --webpack`). No bundler configuration changed.
- Repository-wide lint still reports 20 pre-existing findings in shared UI scaffolding, hooks, and an indexing script; none are in the rebuilt dashboard.
- Actual production server inspected at 320/390/430-pixel phone widths, 834-pixel tablet, and 1440-pixel desktop. Sample and disconnected states were inspected. Touch chart tooltips and keyboard chart navigation were verified; dashboard controls use visible focus and reduced-motion CSS. No browser warning/error or hydration logs in the inspected dashboard views.
- Two generated curriculum documents have their final newline restored to match the existing generators and prevent curriculum drift test failures.

## Remaining integrations

Connect authenticated ambassador identity to commission/order/click reporting, authoritative payout schedules, approved tier economics, and targeted live campaigns/assets. These signals can enter the retained dashboard service and Cassius context without replacing this presentation layer. No production infrastructure or deployment settings were changed.
