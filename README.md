# The Groomed Gent Collective

Local vertical slice for the invite-only Groomed Gent ambassador ecosystem. The current development phase preserves the previous session’s application, responsive shell, domain contracts, templates and demo boundaries. At inspection the Desktop repository contained the application as untracked files, had no commits, and pointed to ggclegacy/groomed-gent-collective on GitHub.

## Run

Node 24 recommended (Node 22.18+ required for native TypeScript tests).

```sh
npm ci
npm run db:migrate:local
npm run dev
npm run typecheck
npm test
npm run lint
npm run build
```

Open the local URL printed by the development server. All sections are addressable through hashes (`#identity`, `#performance`, `#intelligence`, `#knowledge`, `#studio`, `#status`); refresh and browser navigation retain the selected section.

## Implemented

- Obsidian and gold responsive application shell; desktop sidebar and mobile sheet navigation.
- Editorial home with demo membership card, honest unavailable metrics and product-specific navigation.
- Editable demo profile and copyable, deliberately inactive example referral code/link.
- Performance ledger definitions and disconnected states; no fake orders or earnings.
- CASSIUS question workspace: local question save and Creator Studio briefs only; no model calls or generated answers. Studio briefs use a separate key and can be dismissed to restore the saved question. Wellness scope is bounded to education, tracking and preparing clinician questions.
- Four editorial field guides, explicitly unapproved; no invented product catalog or claims.
- Creator Studio with an editable working copy, up to 100 named local drafts, search, reopening, save/update, removal with one-step undo, text export, raw backup download, personal review checks and CASSIUS brief handoff. Existing chair/training/travel templates and caption/conversation formats are preserved. The library collapses on smaller screens so the editor stays close at hand.
- Status foundation with local setup readiness; no invented rewards, rates or membership tiers.
- Typed ambassador, money, attribution, commission, approved product, AI citation and integration-result contracts.

## Truth and access boundaries

The public root remains a device-local demonstration. The new `/membership`, `/members/studio` and `/api/account` workflows enforce invitation and member ownership on the server, using a real local D1 database. **Production authentication is not configured and production member services fail closed.** Local sign-in is the explicitly simulated Sites development identity, not a real customer login. `noindex` metadata is not an access control. No customer, payment, Shopify, AI, attribution or production infrastructure is connected or mutated.

All browser persistence uses versioned `ggc.preview.*.v1` keys. Profile data is validated on read; unavailable storage and clipboard failures have visible recovery feedback. Creator drafts and questions are device-local convenience state, not durable account records. Export important work. Studio uses versioned library and working-copy keys, validates stored records, preserves malformed storage rather than overwriting it, and recovers the prior single draft without deleting its original key. Library saves detect stale snapshots from another tab; this is best-effort conflict detection, not transactional multi-device synchronization. The working-copy slot is shared by tabs, so edit in one tab at a time. Undo lasts until another removal or reload; the visible working copy remains after removal. A raw JSON backup is for manual recovery; no import UI is implemented. Never enter confidential customer information into the preview.

`GENT-DEMO` and the `example.com` referral URL are illustrative only. No customer discount, benefit, commission rate or payout schedule is configured. Editorial guides and templates require brand review.

## Architecture

`app/page.tsx` renders the client application in `components/collective.tsx`. `components/workspaces.tsx` contains the bounded supporting workflows. `components/studio-workspace.tsx` contains the Studio library/editor; `lib/studio.ts` owns validation, save/update rules, review invalidation and exports. Studio stays mounted across section navigation to preserve an editor even if browser storage is unavailable. `lib/collective.ts` contains domain contracts, explicit demo/disconnected adapters, validation and deterministic template creation. `app/globals.css` centralizes responsive styling and the #C4912F palette. Existing scaffold primitives under `components/ui` are composed without modifications.

`IntegrationResult<T>` distinguishes ready, pending, disconnected and error; unavailable metrics must never be mapped to zero. Currency is integer minor units plus an explicit currency code. Commerce adapters must authenticate and authorize on the server, validate remote data, and never trust browser-provided ambassador identifiers for access control. The account API already derives owner identity from the configured sign-in boundary and enforces membership on every private read/write.

Creator Studio optionally registers `prepare_collective_caption` when the proposed browser `document.modelContext` API exists. It validates enums, prepares the same visible draft as the UI, and does not save to the library or publish. It keeps a device-local working copy, refuses to replace a nonempty editor, and is registered only while Studio is active. This optional API is not available in all browsers.

## Strongest next phase

Build a real invitation-to-first-attributed-order flow: approved member sign-in and server-side membership authorization; a database-backed ambassador identity; approved Shopify products and customer benefit terms; unique activated referral codes; signed, idempotent order/refund webhooks; attribution policy and an auditable commission ledger. Prove it against a development store before connecting production. Ground CASSIUS only in approved, versioned brand sources after that content exists.

Nothing has been deployed or pushed.

## Current phase verification

Typecheck, 14 domain tests, application lint (including the new Studio component), and production build pass. Full-project lint still reports pre-existing errors in untouched scaffold primitives and `hooks/use-mobile.ts`; these were not suppressed. The build reports existing Vite configuration and route-classification warnings. Browser verification covered draft save/update, multiple drafts, personal review/reset, replacement cancellation, reload recovery, removal/undo, and CASSIUS handoff. Mobile/tablet geometry and navigation were inspected.

Self-review is never brand approval: placeholders remain visible in status, changing copy/context resets checks, and exports explicitly say they are editorial drafts. No generated AI answers, products, sales, earnings, rewards, health records or partnerships have been added.

The next production phase remains server-authorized invitations and account-backed storage, followed by approved product sources and a development-store attribution/commission flow. Future barber wholesale progression, richer media, wellness/labs, travel, curated discovery, private community and benefits remain deferred. No infrastructure was provisioned and nothing was deployed or pushed.

## Phase 3: invitation and account foundation

### Local development

Run `npm run db:migrate:local` before `npm run dev`. The migration command explicitly uses `--local` and stores the database under `.wrangler/state/v3/d1`; it never applies a remote migration. `wrangler.local.jsonc` shares the local binding identifier used by the Vite configuration. `npm run db:generate` generates Drizzle schema migrations; applied migrations are immutable.

Open `/membership`, then **Sign in for local development**. Sites provides the simulated `local_seedy` / `seedy@sites.test` identity. In development only, this identity can use the Founder Desk. Issue an invitation to `seedy@sites.test`, copy its code, and redeem it above to exercise the complete flow. Local browser verification has already created a clearly labeled verification member and draft. These are local test records, not actual ambassador/customer activity.

Founder access does not automatically create a membership. Invitations bind the intended email, name and ambassador/barber track; expire after seven days; and are revocable until accepted. Only a SHA-256 hash of the random 256-bit code is persisted. Redemption is conditional and transactional. It is idempotent for its member; replay does not restore a suspended membership. A founder may pause and restore access without deleting drafts. The barber track has independent future wholesale eligibility; admission grants no wholesale access.

### Account Studio

`/members/studio` loads drafts from `/api/account/library` after the API confirms active membership. The server always derives the owner from the authenticated identity. Browser-supplied owner IDs are ignored. A revision-checked write atomically replaces only that member's library. Stale writes return 409 and leave the newer stored copy intact. Reloading the library retains unsaved editor text.

The account editor shares the existing Studio controls and domain model. **Save to account** persists the draft in D1. Unsaved account editor text stays in memory, with a leave-page warning; it is never written automatically to shared device storage. Existing device drafts remain in the root preview. **Import device drafts into account** is explicit, leaves originals intact, and skips IDs already present in the account library. It does not overwrite account drafts. Both library modes retain a 100-draft limit; account JSON additionally has a 1.5 MB limit to stay below database row limits. Removed account drafts can be restored using the existing one-step undo while the page remains open.

CASSIUS remains offline. Account drafts are not copied into the root preview's shared question storage; its brief handoff is disabled in account mode. Text export and copying remain deliberate user actions. No AI, commerce or messaging is connected.

### API and trust boundary

- `GET /api/account`: environment readiness, sign-in and membership state.
- `GET/POST /api/account/invitations`: founder-only list and issuance; codes returned only at issuance.
- `POST /api/account/invitations/revoke`: founder-only revocation.
- `POST /api/account/accept`: signed-in, matching-email invitation redemption.
- `GET /api/account/members` and `POST /api/account/members/status`: founder-only membership management.
- `GET/PUT /api/account/library`: active-member reads and optimistic revision writes.

Private responses use `Cache-Control: private, no-store`. Mutations require same-origin JSON requests and bounded request bodies. Validation excludes malformed libraries and strips unknown draft fields. Public errors do not expose database internals. Restoring the membership page from browser back/forward cache triggers session revalidation. The ordinary HTML shell is public; authorization lives in the API, not in hidden UI.

`GGC_IDENTITY_MODE` is deliberately absent from production builds. Setting it to `sites-dispatch` is valid **only behind a trusted Sites dispatcher that strips client-supplied identity headers and prevents bypass through a direct Worker endpoint**. `GGC_OWNER_ID` must then be the intended founder's verified, site-scoped identity. Neither setting was configured remotely. The development-only `sites-local` mode is restricted to localhost; the installed Sites middleware strips incoming identity headers before simulating sign-in. Never expose the local development server as a real private portal. External identity-provider selection and production sign-in require a separate deployment/authentication phase.

### Phase 3 verification

19 tests pass, including five integration tests running the actual migrations and API against isolated SQLite databases: anonymous/owner/CSRF checks; hashed, email-bound and single-use invitations; expiry/revocation; account isolation and stale revisions; suspension and replay behavior. Typecheck, application lint and production build pass. Dependency audit is clean after a scoped override of the migration tool's old transitive esbuild dependency; migration generation was rechecked after the override.

Full-project lint retains the existing 19 scaffold findings. `components/member-access.tsx` intentionally uses full document links for dispatcher-owned sign-in/out and leave-page warnings; a documented, file-scoped framework-link rule exception covers that behavior. No existing scaffold lint errors were suppressed.

The server remains compatible with Sites/Cloudflare; schema, SQL migration, snapshot and journal are included. There has been no deployment, push, remote database creation, remote migration or outbound invitation message.

### Next phase

Add founder-approved, versioned product knowledge and server-side content approval, then ground CASSIUS in those sources. In parallel planning, prepare a development-store invitation-to-first-attributed-order flow with approved referral terms, signed/idempotent order and refund webhooks, and an auditable commission ledger. Live provider credentials, production identity configuration, email delivery, operational audit/history, paginated founder lists, wholesale commerce, health records, rewards and partner networks remain deferred.

## September 2026 visual rebuild

The full existing visual layer now uses an obsidian, forest-glass and dimensional-gold system, with a nonhuman CASSIUS core, floating navigation, responsive workspaces, and consistent member/system states. See [the route-by-route rebuild and verification report](docs/visual-rebuild.md). Application lint, typecheck, 19 tests, production build, and local page-response checks pass. Browser screenshots for this rebuild remain blocked by the browser tool's administrative policy verification failure; earlier browser results above do not verify this new aesthetic. Nothing was deployed.

## Product Studio · local first pass

The existing `/#knowledge` destination is now **Product Studio**: searchable concept vault, twelve-section Product Rooms, ingredient intelligence structure, contextual Atlas preflight, Sales Lab practice, recommendation intake, matchups, daily learning/mastery, claims/evidence and product-aware content briefs. All four product records are explicitly unverified concepts from the supplied planning brief. No formulas, prices, claims, AI answers or earned certifications are fabricated.

See [Product Studio implementation and next-phase handoff](docs/product-studio.md) for the canonical knowledge contracts, interaction/persistence boundaries, complete file list and validation results. AI providers, verified product sources and account-backed mastery remain for the next phase. No deployment or infrastructure change was made.


## Cassius sourced Groomed Gent knowledge

Cassius now answers from a dated, structured local registry of 18 website-listed products and 12 brand/education topics, preserving 11 open issues and field-level source metadata. See [coverage and gaps](docs/cassius/coverage.md), [architecture](docs/cassius/architecture.md), [maintenance](docs/cassius/maintenance.md), and [verification](docs/cassius/verification.md). Generative AI remains disconnected; website evidence does not approve advertising claims. Nothing deployed.
