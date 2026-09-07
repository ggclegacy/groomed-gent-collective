# Katie account readiness

**Status: NOT ready for real account creation on the deployed app.** Checked September 7, 2026. The production account endpoint reports `configured:false`, and signup displays “Account services are being connected.” These local fixes do not activate a provider or database.

## Changes in this pass

- Clerk middleware covers app pages and APIs, consistent with the global provider; membership is now protected. Static assets remain excluded.
- Signed-in users lacking a verified primary email receive a specific recovery instruction with Account settings instead of being sent through a sign-in loop.
- Completed onboarding rejects stale draft saves (including a stale first-save revision). Both database adapters have regression coverage.
- “Salon / Barbershop Owner” reuses the optional business context step. It grants no administrative or wholesale permissions.
- Preferred-name input supports phone autofill. Existing premium design, session boundary, private API checks, recovery components, database schema and partner invitation flow are retained.

## Required activation

Use the existing Vercel project `groomed-gent-collective` and the existing Clerk application if one exists. The connected Neon organization currently exposes only an unrelated Atlas Creed project. Identify or provision a dedicated Collective database; do not reuse Atlas Creed.

Production Vercel environment:

| Name | Value/source |
| --- | --- |
| GGC_ACCOUNT_PROVIDER | clerk-neon |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Production Clerk publishable key |
| CLERK_SECRET_KEY | Matching production Clerk secret, entered securely in Vercel |
| DATABASE_URL | Pooled URL of the intended Collective Neon database |
| GGC_OWNER_ID | Optional: Neil’s verified Clerk user ID for founder administration |

Migration execution only: `GGC_MIGRATION_DATABASE_URL` is the direct URL of the intended database branch. Apply existing registered migrations 0000–0005 on an isolated staging branch first with `npm run db:migrate:postgres`, check the migration journal and existing data, then apply to the intended production branch. Do not activate dormant commerce/economics migration candidates for this account test.

No actual secret values are stored in this report or repository. Vercel environment inventory returned HTTP 403, so individual missing variable names could not be independently confirmed. The runtime proves the required configuration as a whole is absent/incomplete.

In Clerk, enable public signup with required verified email and email/password recovery (or verified email-code login). Use Katie’s own accessible email. Verify production domain/DNS and allowed origins for the exact app domain. Set sign-in/up routes to `/sign-in` and `/sign-up`, with completion at `/auth/continue`. Configure finite session lifetime/inactivity settings appropriate for testing. Ensure verification and recovery mail deliver. Disable self-service provider deletion until app-data erasure is implemented.

Google/Apple are optional for the initial test: verify them only if already enabled, including provider production credentials, exact callback URLs, consent/test audience and Apple relay mail configuration. Otherwise use verified email. Do not make new OAuth setup a prerequisite for Katie.

Deploy the reviewed authentication changes to the existing Vercel project after configuration. The public Clerk key requires rebuilding. Follow [Clerk’s middleware reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) and [production Next.js integration guidance](https://clerk.com/docs/nextjs/getting-started/quickstart). The legacy Sites configuration is retained; this app should not be published as a replacement Site.

## Exact rehearsal before the visit

Run first with a disposable account/email you control. Do not create Katie’s account in advance or use Neil’s email for her.

1. Open `https://groomed-gent-collective.vercel.app/sign-up` in a fresh browser profile. The real Clerk signup form must appear. If it says services are being connected, stop: it is not ready.
2. Create the test account and complete verification from its inbox. Confirm the app opens onboarding. Verify one `account_profiles` row exists for the Clerk user ID.
3. Enter a preferred name and press Continue. Choose Salon / Barbershop Owner. Continue to the optional business step, enter a salon name, and press Save and finish later. Wait for navigation; unsaved typing alone is not a confirmed save.
4. Close the browser completely, reopen `/auth/continue`, and confirm the same answers and saved step. Complete setup, review the business details and approve the profile. Confirm the same account ID and one profile row, with no remaining onboarding draft.
5. Close and relaunch again. Expect the completed account’s Command screen. Open My Cassius and confirm the approved details remain.
6. Sign out in Account settings. Try `/membership`, `/onboarding`, `/my-cassius`, `/voyage` and `/members/studio`, including the Back button. No prior private data should be visible. Private API requests must reject the logged-out user.
7. Sign in again with the same email; the same identity and data must return. Try a signup with that same email: it must lead to existing-account handling, without a second Clerk identity/profile.
8. Use Forgot password (or the configured email-code recovery). Complete recovery from the test inbox and sign in again. Confirm the account ID and profile remain the same. If passwords are used, verify the old password no longer works.
9. On Safari/iPhone, Share → Add to Home Screen; on Chrome/Android, use Install app/Add to Home screen when offered. Launch the icon, sign in if the installed app uses a separate session, close it, and relaunch. Browser and installed-app sessions need not transfer automatically; signing in must recover the same backend account. Test the actual phones, not just responsive viewport emulation.
10. Verify another test account sees none of the first account’s personal data. Test expired/revoked sessions. If social providers are enabled, test success, cancellation and connecting an account from Account settings.

For Katie’s visit: use her phone, her email, and let her enter/save her password or receive her login code. She can save setup and finish later. Salon context does not itself approve wholesale or ambassador access; Neil can handle partner membership separately.

## Release gate

Only call this ready after live signup, verification, recovery, repeat login, backend persistence and real-phone relaunch pass on the final production domain. Local database tests and a successful build do not satisfy that gate.
