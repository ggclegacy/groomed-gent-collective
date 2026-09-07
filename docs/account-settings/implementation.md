# Account & Settings

## Routes and ownership

`/account` is the member home. Desktop navigation, the mobile dock and standalone workspace shortcuts lead here. `/account/security/[[...security]]` embeds the pinned Clerk UserProfile with path routing. `/member-session` redirects there, retaining existing recovery and account links. All account routes use the existing protected-page matcher. Signed-out or unconfigured pages never show fabricated profile data.

Clerk is authoritative for full name, photo, username (when enabled), verified email, passwords, recovery, connected providers and sessions. The Collective stores its preferred/display name and optional phone, location and business affiliation separately. The contact phone is not a verified recovery method. Existing onboarding answers and Gentleman Profile remain independently editable; editing a contact field does not silently approve it as Cassius knowledge. Roles, partner track, suspension and wholesale status remain server-controlled. No referral codes or tiers are invented.

`GET/PUT /api/account/settings` persists settings by verified user ID. First writes and subsequent edits use atomic revision comparisons. Stale edits return 409 rather than replacing another device's work. Requests are same-origin JSON with bounded input. The account settings/export routes remain available to suspended members without restoring partner privileges. The client retains unsuccessful edits and explicitly asks before replacing unsaved work with saved data.

Reduced motion is applied throughout the signed-in app and restored from account storage on each session; OS reduced motion remains respected. Communication preference is stored with no optional updates by default. This release does not start campaigns or request push permissions; future delivery must check this preference at send time and provide unsubscribe handling.

Cassius personalization uses the existing versioned intelligence API. Links lead to its existing per-detail review and erasure controls. A deliberate `POST /api/account/export` downloads an owner-scoped copy of Collective profile, membership, settings, onboarding drafts, private memory, saved draft library, learning and intelligence records. The export explicitly excludes Clerk sign-in records, device-only drafts and separately managed commerce records. No invitation tokens or other members' data are included.

## Schema and activation

Additive migration: `migrations/postgres/0006_whole_fallen_one.sql` creates `account_settings` (owner ID FK to account_profiles, revision, JSON document stored as text, saved timestamp). Equivalent retained Sites/SQLite migration: `drizzle/0006_boring_starbolt.sql`. Generated schema snapshots and journals are included. No existing account rows are rewritten.

No new environment variables. Existing `GGC_ACCOUNT_PROVIDER=clerk-neon`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL` are required. Use `GGC_MIGRATION_DATABASE_URL` and the existing migration command to apply the full journal to the intended database, first checking an isolated branch. Never use the unrelated Atlas database.

Production readiness check on September 7, 2026 returned `configured:false`. There is no local Collective Clerk/Neon configuration. Live signup, verification emails, account sessions and OAuth cannot be certified until the operator completes `docs/account-authentication.md`. Run the new migration before enabling accounts; redeploy after public key setup.

## Deletion and policy configuration

There is no delete-account control. Clerk's danger section is suppressed in this embedded surface, but CSS is not an authorization boundary. The operator MUST also disable Clerk self-service user deletion until a coordinated workflow exists. A correct implementation needs recent authentication, explicit confirmation, a retention policy, inventory of all app/external data, transactional or resumable app-data erasure, invitation/member references, commerce retention decisions, provider deletion and session revocation, webhook reconciliation, audit receipts, retry/idempotency, and backups handling. Do not delete only the Clerk user and leave the account records orphaned.

Support and legal links use the brand's existing published contact/privacy/terms URLs from its knowledge registry. They are labeled as brand policies, not newly approved app-specific legal documents. The owner should have policies reviewed for the app's Clerk, Neon and Cassius processing and data-request procedure before launch.

## Required live acceptance

After configuration: create a disposable email account, verify the email, complete onboarding, open Account from mobile navigation, edit preferred name/contact details, save, refresh, log out, confirm protected routes and APIs reject access (including back navigation), sign in again, verify the same values. Also test photo/full-name edits, email verification/recovery, enabled OAuth methods and session revocation through Clerk. Test a second account and two simultaneous settings editors. Repeat at phone and desktop sizes; test physical installed iOS/Android PWA separately. Local database or mock-provider browser tests do not verify Clerk cookies or mail delivery.

## Reproducing browser checks

`node --experimental-strip-types scripts/qa/account-harness.mjs` starts an isolated localhost-only server on port 4319. It bundles the real Account UI and SessionBoundary with an explicitly simulated Clerk provider, and runs the actual account API against migrated PGlite. It is never imported by the app or production build. Run `node scripts/qa/account-check.mjs` with Playwright installed in the test environment (or `GGC_PLAYWRIGHT_MODULE` set to its installed module location). Screenshots and a test export go to a temporary directory, or `GGC_ACCOUNT_QA_OUTPUT`. This verifies the UI/database boundary and simulated session transitions; it cannot certify Clerk authentication.
