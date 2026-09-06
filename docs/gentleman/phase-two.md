# Phase two — Voyage, Circle and production account foundations

## Implemented

Voyage now has a dedicated trip command workspace: structured, editable itinerary events; UTC instants with IANA-zone display; date-range validation; overlap detection; current/next event; completion; fixed commitments; related Circle contacts; editable city notes; grooming preparation checklist; and standards-based calendar-file export. Fixed and completed events survive AI replanning. AI output never becomes a booking or a verified reservation.

Circle now has organization/role, last-contact date, conversation intention, an optional follow-up rhythm, and meeting briefs assembled from recorded relationship context, linked Voyage meetings and open Desk tasks. A deliberate action creates one linked follow-up task. Recording contact completes that task and calculates the next date. No email, calendar invitation, reminder or outreach is sent. The user reviews the Cassius prompt before transmitting relationship notes.

The `/api/voyage/plan` handler reads the trip from authenticated account memory, checks its revision, optionally includes consented travel/taste/style/grooming preferences, and requests strict structured output. It validates dates, time zones, IDs and bounded fields again after generation. The UI previews a plan and refuses to apply it after the underlying trip changes. No automatic save or retry. Requests use `store:false`, a deadline, same-origin validation and process-local per-member rate limiting.

## Memory and source reconciliation

The current local source had retained new first-phase files but reverted tracked integration points: navigation, layout import, account memory handlers, schema registration, and migration journal entry. These were reconciled with the retained `0001_gentleman_memory.sql` and its matching snapshot. The existing SQL and snapshot were not rewritten. Newer Cassius conversational behavior and Living Materials were preserved.

Memory format 2 adds optional tripPlan, relationship and related-person fields. The parser reads version 1 and canonicalizes to 2 without discarding original notes. Only explicit saving writes the upgraded document. Referential checks prevent missing-person links. Deleting a person unlinks associated trip events and tasks. Context assembly remains opt-in and bounded, including escaped input. The existing D1 table can store the new document without a column migration.

## Production identity and storage

The existing Vercel project was located: `groomed-gent-collective`, linked to `ggclegacy/groomed-gent-collective`.

The new adapter is opt-in with `GGC_ACCOUNT_PROVIDER=clerk-neon`. It uses Clerk's verified server session plus verified primary email; arbitrary request identity headers are ignored. Signing in alone does not grant membership: the existing invitation redemption and active-member checks remain in force. Founder administration requires the exact configured Clerk user ID. The existing Sites dispatcher remains the D1 identity path.

Neon's HTTP Postgres driver implements the shared prepared-query contract. Values stay parameterized; invitation batches remain transactions. Drizzle Postgres schema and generated migrations live separately under `migrations/postgres` and do not get applied to Sites D1. A local PostgreSQL engine exercises the generated SQL and production query adapter.

Required production settings:

- `GGC_ACCOUNT_PROVIDER=clerk-neon`
- `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL` for the intended Neon database
- `GGC_OWNER_ID` set to the verified founder's Clerk user ID
- Existing `OPENAI_API_KEY`, optional `CASSIUS_OPENAI_MODEL`, and `CASSIUS_ENABLED` for AI

Configure Clerk's allowed production domains and redirects. Provision a dedicated database or branch for this app, apply both generated Postgres migrations on an isolated branch first, and verify two-member isolation before promotion. Existing Sites user IDs are not automatically mapped to Clerk accounts; migrating real members requires explicit identity mapping and a reviewed data transfer. Do not repoint existing member data by email alone.

The sign-in and account-menu pages show a setup state when the adapter is disabled. Runtime configuration errors fail closed. No production credentials were read, printed, invented or committed. No new cloud account, paid resource, remote migration, deployment or real AI generation was performed in this phase.

## Limits and next sequence

- Activate and verify Clerk/Neon against the actual production account configuration. End-to-end real sign-in is not established by SQL tests.
- Current city intelligence provides editable notes plus reviewed official-source links for London, Paris and Tokyo. It is a source directory, not live search or verified venue availability. Add a server-side source retrieval/cache layer with freshness timestamps next.
- Surprise Me is an exploratory itinerary proposal using the current planning zone. Before travel to a different zone, update trip details and regenerate/review times. Fixed commitments require a separate exploratory trip.
- Event scheduling uses one display zone per trip. Multi-city per-event zones, flights, bookings and loyalty integrations are deferred.
- Follow-up cadence is calculated after recorded contact; no scheduler is attached.
- Rate limits are per process, not a distributed spend or abuse control. Add a durable per-member request ledger before scaled rollout. Provider failures return no fabricated fallback.
- Calendar export creates a file; it does not connect or modify a calendar.
- Browser session and real-provider verification must precede production release. Account database encryption/backup retention and audit policies still need deployment-specific review.

## Primary implementation references

- [Clerk Next.js integration](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Neon serverless driver and transaction API](https://github.com/neondatabase/serverless)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- Source directory: [Visit London](https://www.visitlondon.com/), [Paris tourist office](https://parisjetaime.com/eng/), [GO TOKYO](https://www.gotokyo.org/en/). Links checked September 5, 2026; no current venue claims were imported.

## Continuation workspace

The authoritative source for this phase is now `gentleman-os-work/app`, isolated from the shared `visual-dashboard-work/app` copy after integration files were repeatedly restored there between turns. Newer shared visual and Cassius modules were copied before restoring the OS integration. This is a source continuation, not a production deployment. Local dependency reuse is a symlink; the source archive excludes it and includes the dependency lockfile for a fresh install.
