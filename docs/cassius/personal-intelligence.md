# Cassius accounts and living personal intelligence

Implemented September 6, 2026 in the existing `gentleman-publish` repository, alongside Product Mastery, the current Command experience, and the original partner membership service. Public account creation does not issue an invitation, grant wholesale access, or activate partner membership.

## Member journey

- `/onboarding` is the account entry and Meet Cassius flow. `/sign-up` and `/sign-in` use the existing Clerk integration, including its verification, recovery and configured social providers. Both return to onboarding. Members who already completed it see their knowledge space.
- Questions cover preferred name, roles, improvement priorities, a free-text goal, conditional business-owner context and preferred collaboration style. Every question is optional. The member can explicitly begin without saved knowledge. Answers stay in page memory until approval; navigating away discards unfinished answers. The existing optional browser speech-recognition control is shared with Product Mastery and reused for goal/business answers. It starts only on a button press and may use the browser vendor’s speech service, as disclosed beside the control. Typing and phone keyboard dictation remain fallbacks. Transcripts are editable before approval; the app does not retain audio recordings.
- Bring Your Context offers ChatGPT, Claude, Gemini and Other AI. Its generated prompt requests bounded JSON, separates facts from uncertainty, and excludes secrets and unnecessary sensitive information. JSON is parsed deterministically. Plain text becomes individual, sensitive, uncertain proposals for category review. Raw input is never persisted or sent to an AI by the parser. Malformed structured input fails with an actionable message.
- Source certainty is shown separately from member confirmation. Imported items default to **Not sure**, even if the source calls them facts. Correct, Not sure, Not anymore and Remove determine the saved confirmation/state. Editing text alone never converts uncertainty into confirmation. `Build My Cassius Profile` explicitly approves the selected proposed records.
- `/my-cassius` offers grouped search, editing, confirmation, retirement, disputed state, removal, privacy labels, connections and full knowledge erasure. A light CSS orbit puts the member at the center; accessible cards and category controls perform the actual work. No WebGL, graph library, continuous animation or new imagery is required.

## Data model

Five additive tables are declared in `db/intelligence.sqlite.ts` and `db/intelligence.postgres.ts`, exported by the existing Drizzle schemas. The SQLite migration is `drizzle/0003_broken_the_twelve.sql`; the Postgres migration is `migrations/postgres/0003_military_titania.sql`. Existing migrations are unchanged.

| Table | Purpose |
| --- | --- |
| `intelligence_accounts` | Verified provider owner ID, profile revision, onboarding completion, AI-use consent (off by default) |
| `intelligence_nodes` | Individually addressable knowledge entities, keyed by owner and ID; a bounded typed document per entity |
| `intelligence_events` | Append-only snapshots of entity revisions and their timestamps; corrections preserve prior content |
| `intelligence_edges` | Typed relations between two entities of the same account; composite foreign keys prevent cross-account connections |
| `intelligence_versions` | Unique per-owner revision reservations, ensuring conflicting transactions cannot silently overwrite changes |

Nodes represent identity, work, business, project, goal, milestone, accomplishment, preference, person, interest, AI style, place and routine. Each includes source, source certainty, member confirmation, privacy classification, creation/update/confirmation timestamps, current/historical/disputed state and revision. This is an entity graph, not a single mutable profile blob. Relations include supports, has_project, has_milestone, achieved and related_to, allowing Goal → Project → Milestone → Accomplishment without deleting the original goal.

The original source stays attached through member corrections; the revised snapshot and time distinguish new versions. Source labels are declared provenance, not cryptographic proof of the source AI. Confidence is represented by source certainty and member confirmation rather than a misleading numerical probability. Dates shown in the interface make freshness inspectable; no fact automatically becomes more certain with age.

## API and consistency

The existing `/api/account/[[...path]]` route dispatches `/api/account/intelligence` to the shared service. GET reads the signed-in owner's graph. POST supports `parse`, `approve`, `update`, `remove`, `connect`, `disconnect`, `settings`, `skip` and `erase`. Every mutation includes the currently observed `revision`; approval additionally requires `approved: true`. The owner ID comes exclusively from the existing verified identity adapter, never the request body.

Each write uses one database transaction/batch: first reserve the next unique owner revision, then update head, nodes, history and edges. Two concurrent writes with the same revision cannot both commit. A stale request receives 409 and its client-side edits remain available. A replay cannot create duplicate accepted records. Reads and all writes are owner-scoped. These account endpoints require verified identity but deliberately do not require invitation-only membership.

Input is streamed with a 120 KB limit for this endpoint. Transfer text is limited to 40,000 characters, 80 items per approval/import, 1,200 characters per item, 500 nodes and 1,000 connections per account. Same-origin JSON is mandatory for POST. No-store responses, generic internal errors, composite ownership keys and prepared queries follow the existing account conventions. No prompts or database exceptions are logged by this service. Secret detection rejects common token, password, private-key, account-number and identification patterns. It is a defense in depth heuristic, not a guarantee of detecting every secret; the source prompt and human review remain necessary.

Removing an item deletes its history and graph connections in the same transaction. Full erasure deletes all knowledge, histories and connections, resets completion, and disables personalization. The revision ledger contains only owner IDs and counters and remains to reject stale replays. It is not an account-deletion endpoint. Existing chat transcripts, partner records, legacy Gentleman memory and provider backups have separate lifecycles. Backups follow the deployment's retention policy; removal does not promise immediate deletion from all backups.

## Cassius integration and consent

The existing conversation handler accepts an optional server-only `memberContext` resolver. `/api/cassius` uses the verified account adapter, never client-supplied knowledge or spoofable identity headers. It includes only confirmed, current, private records when the member enabled “Use my context.” Sensitive, unconfirmed, historical and disputed entities are excluded. This opt-in sends selected context to the configured AI provider when the member chats. It can be withdrawn at any time.

Context is explicitly untrusted reference data, never system instructions. The provider request keeps `store: false` and grants no tools or memory-writing capability. The model must not claim to save memory. Future conversational extraction can propose nodes through the same review/approval workflow, and corrections can use the revisioned update service. Automatic extraction and silent conversational writes are intentionally not enabled. Prompt injection cannot be solved by a delimiter alone; authorization, approval and lack of model write tools enforce the boundary outside the model.

## Configuration Neil must supply

Use `.env.accounts.example` as the names-only template. No keys or personal production data were used in implementation tests.

| Variable | Value / purpose |
| --- | --- |
| `GGC_ACCOUNT_PROVIDER` | `clerk-neon` for the existing Next.js deployment |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key from the matching Clerk environment; available during build |
| `CLERK_SECRET_KEY` | Matching server-only Clerk key |
| `DATABASE_URL` | Neon runtime connection string, restricted to the application's database |
| `GGC_MIGRATION_DATABASE_URL` | Separate migration connection for the target branch; do not expose to browsers |
| `GGC_OWNER_ID` | Existing founder account ID, only for partner administration; not needed to create ordinary profiles |
| `OPENAI_API_KEY` | Existing server-side Cassius provider key; unnecessary for parsing, reviewing or storing personal context |
| `CASSIUS_OPENAI_MODEL` | Existing model override, if desired |

In Clerk, enable email sign-up with verification and email-code sign-in for low friction. Keep phone number and name requirements optional because Meet Cassius asks the preferred name separately. Enable Google and/or Apple only after supplying the provider's required production credentials and redirect/domain configuration. The embedded Clerk component displays the actual configured options; it does not show fake enabled OAuth buttons. Apple production setup requires an Apple Developer account, Services ID, Team ID, Key ID/private key and private-email-relay configuration. The existing identity adapter requires a verified primary email, so retain that requirement for social sign-in too.

Configure Clerk's production application domain and origins for the real deployment. Routes are `/sign-in`, `/sign-up`, with post-auth redirect `/onboarding`. Proxy matchers include both auth pages, `/api/account/*`, `/api/cassius`, and the original protected service routes. Keep production secrets in the hosting secret store, never Git. Enforce HTTPS; use the managed database's encryption and retention controls, restricted database credentials, and deployment perimeter rate limits. This implementation does not claim end-to-end or application-level encryption.

Apply the checked-in migrations to an isolated Neon branch first using the existing Drizzle Postgres configuration (`npx drizzle-kit migrate --config drizzle.postgres.config.ts`). Validate account creation and the complete approval/edit/remove flow there before promoting migrations and application code together. The retained Sites/D1 adapter uses the same service and its existing `GGC_IDENTITY_MODE`/dispatcher authentication, with `npm run db:migrate:local` for local D1. It does not impersonate Clerk on Sites. The repository's hosting file has no registered Sites project ID; this work retains the established Next.js deployment rather than registering a second app.

Until credentials and migrations are present, the application shows an honest unconfigured state. Authentication itself must still be exercised against a configured Clerk test instance before production release, including email verification, recovery, social callbacks, sign-out/back navigation, and two separate user accounts.

## Validation and research

The test suite covers both actual SQLite and embedded Postgres migrations, account isolation, same-origin enforcement, import non-persistence, explicit approval, uncertainty, privacy gating, revision conflicts, simultaneous saves, history retention, graph ownership, cascading removal, full erasure, secret patterns, size limits and server-side context injection into a mocked provider call. It uses no real credentials and makes no paid provider calls.

Design decisions follow these primary references, reviewed September 6, 2026:

- [Clerk SignUp](https://clerk.com/docs/reference/components/authentication/sign-up) and [sign-in/sign-up options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options): use the installed provider's maintained verification and authentication UI.
- [Clerk Apple connection](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple): production credentials and relay setup belong to the deployment, not hardcoded UI.
- [OWASP AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) and [Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html): external context is untrusted; enforce authorization and write approval outside the model.
- [W3C PROV namespace](https://www.w3.org/ns/prov): provenance, revision and invalidation inform the source/history model; this is not a claim of full PROV-O conformance.
- [Neon security overview](https://neon.com/docs/security/security-overview): TLS and managed encryption protect transport/storage; application ownership checks remain necessary.

### Verified release checks

- Full suite: 189 passing tests. After extracting the shared voice control, all 15 targeted intelligence/Product Mastery tests also passed.
- Application lint and TypeScript checks passed. Both final Next.js and Sites builds passed; run these sequentially because Sites generates shared route-type artifacts that Next.js regenerates.
- HTTP checks passed for the existing home/membership pages and new onboarding, knowledge, sign-in and sign-up routes. Account responses remain private/no-store; forged Sites identity headers do not unlock an unconfigured Next.js private endpoint.
- No live Clerk/Google/Apple account, production database, paid AI call, microphone session, or phone/browser interaction test was performed. No remote migration, push or deployment was performed. The local preview's stale development cache was moved aside and its existing address restored.
