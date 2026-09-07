# Persistent accounts and phone testing

## Architecture

Keep the project's pinned Clerk Next.js SDK and Neon Postgres adapter. Clerk owns email verification, passwords, recovery, Apple/Google OAuth, account linking and revocable sessions. The app never handles or stores passwords, provider secrets or session tokens. Neon stores the verified Clerk user ID, email, preferred name, account role, resumable onboarding, approved Cassius knowledge and private feature memory. A verified primary email is required by the server adapter. Identity headers supplied by a browser are ignored on Vercel.

The original `.openai/hosting.json` belongs to the retained Sites development path; production remains the existing Next.js/Vercel project. Do not create a replacement Site or new production database to activate this release.

## Activation required before real signup

The production `/api/account` endpoint reported `configured:false` during this task. No provider keys or database URL were available locally. The source is integrated, but real email/Apple/Google signups are NOT verified or activated by this commit.

1. Select the Groomed Gent Collective Clerk application, using separate development and production instances. Set public sign-up, email as a required identifier, verification at sign-up, and email/password sign-in with email-code password recovery. Clerk's `SignIn` includes Forgot password. Alternatively enable verified email codes for passwordless sign-in/recovery. Do not disable email verification.
2. Enable Google for sign-up and sign-in. Production requires your Google OAuth client ID/secret, the authorized JavaScript origin for the app's production domain, and the exact redirect URI supplied by Clerk. Configure the Google consent screen for the intended audience and publish it or add authorized test users.
3. Enable Apple for sign-up and sign-in. Production requires the Apple Developer Team ID, Services ID, Key ID and private key. Register the domain and exact return URL shown by Clerk. Configure the Apple private email relay email source so verification/recovery reaches users who hide their email. Enter these credentials into Clerk, never this repository.
4. Configure Clerk's production domain/DNS and allowed origins/redirect URLs for the existing Vercel app domain (and a custom domain if used). Use a separate Clerk development instance for localhost/preview testing. Set application routes to `/sign-in` and `/sign-up`; both finish at `/auth/continue`.
5. Set `.env.accounts.example` variables in the matching Vercel environment. `GGC_ACCOUNT_PROVIDER=clerk-neon`, both Clerk keys and `DATABASE_URL` must all be present. Use the pooled Neon application URL. Restrict database credentials to this application's database; keep migration credentials separate.
6. Apply migrations to an isolated Neon branch and verify existing data, then apply the same migrations to the intended production branch. `GGC_MIGRATION_DATABASE_URL` must be the explicit direct URL of the chosen branch; run `npm run db:migrate:postgres`. This uses the existing Drizzle journal. If earlier migrations were manually applied, reconcile that journal before running the migrator; do not rerun table creation against an untracked live schema.
7. Configure Clerk session maximum lifetime and inactivity policy for the business's testing requirements (for example a 30-day maximum and 7-day inactivity timeout). Never configure unlimited sessions. Clerk's SDK maintains/refreshes the signed-in session within that policy; a revoked/expired session requires login. Authentication needs connectivity. Password recovery and signout remain provider-managed.
8. Redeploy after environment setup because the public Clerk key is included at build time. Verify `/api/account` reports configured, but never expose secrets in a readiness response.

Provider buttons are rendered by Clerk only when enabled in that application's dashboard. Displaying static Apple/Google buttons would not configure their credentials.

## Roles and ambassador testing

Every verified account receives an idempotently created `account_profiles` record with role `member`. The immutable Clerk ID is the key; email changes update the profile without transferring data. Name is updated from user-approved onboarding. User-authored professional roles in onboarding never grant permissions.

`GGC_OWNER_ID` is an explicit Clerk user ID used to bootstrap founder access. It contains no Neil-specific assumption. A trusted database operator can promote an existing account with a parameterized update to `account_profiles.role` (`admin` or `founder`). There is intentionally no public role-write endpoint. Persisted promotions must also be explicitly revoked in the database; removing the bootstrap variable alone does not revoke a saved founder role.

A founder/admin uses `/membership` to issue an invitation to the tester's verified email. The tester signs in and redeems the code there. Invitation grants are single-use, expire after seven days, and remain bound to that email; suspension cannot be reversed by replay. Partner membership/track remains authoritative in `members`, including barber versus ambassador. Wholesale approval is separate. An ordinary account can save Cassius knowledge and personal memory before partner enrollment, but learning and ambassador draft libraries require active partner membership. Suspended members are denied private data APIs.

## Persistence and privacy

`/auth/continue` opens onboarding for a new account and Command for a completed account. Each Continue/Back action saves the answers and next step before advancing; Save and finish later saves the current step before leaving. Text not yet saved with one of these controls remains an unsaved edit. Drafts are private account data and are not supplied to Cassius. Completing/erasing onboarding clears the draft. Approved knowledge uses the existing versioned intelligence store, conflict detection, per-detail review and optional personalization consent. Only eligible confirmed context reaches Cassius through its server adapter.

All application pages are protected by the server proxy by default; only sign-in/sign-up and static assets are public. Private APIs require authentication, with account handlers independently verifying identity and permissions. Missing or incomplete configuration redirects pages to sign-in and denies private APIs. A visual demo requires explicit GGC_DEMO_MODE=true on a local development server; production and Vercel previews cannot opt into it. See docs/production-auth/audit.md.

Account settings at `/member-session` exposes Clerk's UserProfile, including password/email management, connected accounts and active sessions, plus explicit logout. The SDK provides verified-email linking where supported. For an Apple relay email differing from an existing account, sign in to the existing account and connect the provider through settings; never merge local records based on an unverified email. Account deletion is not implemented as an application data-erasure workflow; disable provider-side self-service deletion until a separate retention/deletion workflow is implemented.

API responses are private/no-store. Sessions are not put in localStorage. Account changes remount the workspace and navigate to the matching session; browser back-cache restoration reloads the page. Private data is not cached for offline use. No service worker intercepts authentication callbacks.

## Phone installation and acceptance checks

Open the HTTPS production domain in Safari and use Share → Add to Home Screen. On Android, use Chrome's Install app/Add to Home screen option. The manifest supplies standalone mode, branded icons and `/auth/continue` as the launch route. Safe-area spacing and 16px form inputs support phone keyboards. This is an installable web app, not an App Store binary.

Before calling production ready, complete these checks with separate disposable accounts in the development instance, then a controlled production smoke test:

- Email signup → verification → account profile → onboarding; close/reopen after Continue and check the saved step.
- Complete onboarding → Command; refresh, close/relaunch, and log in on a second device to verify saved knowledge/private memory.
- Forgot password/email-code recovery; old password fails after reset; new login opens the same account.
- Apple and Google sign-in, cancel/deny return, and linking from an existing account; confirm the same Clerk ID/data where linking is expected.
- Logout and session revocation → direct private page/API requests denied; back navigation does not reveal prior account state.
- Two accounts cannot read/write one another's onboarding, knowledge, memory, learning or drafts; switching accounts removes prior working state.
- Founder invitation → ambassador enrollment; ordinary onboarding's Founder choice does not enable administration; suspension denies private data.

## Verification scope

Automated Postgres and SQLite tests exercise migrations, real database persistence, two-user isolation, revision conflicts, malformed/forged requests, role protection, invitation enrollment/suspension and Cassius context consent. They supply a verified identity at the adapter boundary; they do not claim to test Clerk's live OAuth or cookie lifecycle. Live provider and physical-phone checks remain pending credentials and setup above.

## Official references

- [Clerk Next.js integration](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Google connection](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)
- [Apple connection and production credentials](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple)
- [Verified account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking)

### Historical results for the initial account implementation

- Full automated suite: 194/194 passed. One additional Postgres upgrade test subsequently passed (195 distinct tests verified in total), proving that an existing member's private-memory document and revision survive the new foreign-key migration.
- Next.js production build and TypeScript: passed. Application lint: passed.
- Production runtime: seven private-page paths redirect to sign-in when Clerk mode is selected with incomplete configuration; three private APIs deny access with forged identity headers; readiness uses no-store; sign-in/sign-up/manifest and phone icons return 200.
- Browser: inspected the unconfigured sign-in screen at 390 × 844; controls fit the viewport and no browser errors were reported. Provider forms, live signup/recovery/OAuth, actual logout/cookie persistence, and physical phone installation could not be exercised without a configured Clerk instance.
- No live database migration, provider credential change, or production deployment was performed. The existing production app remains unconfigured for accounts until activation.

## September 7 follow-up

See [Katie readiness and activation checklist](auth-readiness/katie-checklist.md) and [pre-change audit](auth-readiness/audit.md). The live app still reports accounts unconfigured. This follow-up broadens Clerk middleware coverage, protects membership, provides a verified-email recovery route, prevents completed onboarding from accepting stale drafts, and adds salon-owner context. Email signup is the preferred first activation; Google and Apple are optional unless already configured.
