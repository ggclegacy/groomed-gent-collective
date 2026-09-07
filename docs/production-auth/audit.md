# Production authentication audit — September 7, 2026

## Root cause and release source

Production at `groomed-gent-collective.vercel.app` was deployment `dpl_6V1VRKuLArkKd1TTYSN2kzSotxVj`, a CLI release of the Account work, not current GitHub main. Main was `3a5b735`; Account improvements ended at `1585678` on `codex/account-settings`. This fix starts from those Account commits and preserves them. Other uncommitted Field/Voyage changes in `gentleman-publish` are independent work and were not overwritten.

A fresh isolated browser reached the Command workspace and displayed “Welcome back” without a session. The Vercel environment inventory contained OpenAI, ElevenLabs and Mapbox variables only. `GGC_ACCOUNT_PROVIDER`, both Clerk keys and `DATABASE_URL` were absent. The previous proxy only redirected incomplete setups when the provider flag was explicitly selected; an absent flag bypassed authentication entirely. The layout omitted ClerkProvider in that state and rendered the demo shell. This was not an existing authenticated cookie.

Vercel links the correct GitHub repository `ggclegacy/groomed-gent-collective`, production branch `main`, Node 24. The checked-in vercel.json specifies Next.js, npm ci and npm run build. The project dashboard's framework override is unset; vercel.json provides it. Historical `.openai/hosting.json` is for the retained Sites development adapter, not the requested production platform.

## Fix

- Production and preview deployments fail closed regardless of missing, misspelled or incomplete provider settings. All application pages require a session by default, including future routes, RSC requests and catch-all paths containing file extensions.
- Every app API except GET account readiness requires authentication at the server proxy. Existing account handlers also enforce verified provider identity, verified primary email, owner-scoped queries, role checks and same-origin mutations.
- Visual demo access requires explicit local-development opt-in and is ignored on Vercel and production builds.
- Home independently checks the server account adapter and creates/attaches the persistent profile before rendering the workspace. Account independently checks the server session and renders the implemented settings page. Missing setup redirects to auth rather than presenting a placeholder Account page.
- ClerkProvider uses dynamic session rendering. The client session boundary withholds private UI until the user is resolved, remounts on identity changes, and redirects when signed out. Logout remains Clerk signOut with redirect to sign-in.
- GGC_ACCOUNT_PROVIDER=clerk-neon was saved to the existing Vercel project's Production environment.

## Persistence audit

Clerk identity is obtained exclusively through auth()/currentUser(), with matching immutable user ID and verified primary email. Browser identity headers do not authorize Vercel requests. The Neon adapter binds that identity into the shared account service. ensureProfile upserts account_profiles by Clerk ID and preserves previously saved profile fields. No password or session is stored in localStorage. Existing demo ambassador/reporting fixtures do not grant identity or permissions.

Onboarding drafts save revision, answers and step per account; completion saves intelligence and clears the draft. Completed onboarding rejects stale draft resurrection. /auth/continue reads persisted completion and chooses onboarding or Command. Settings, private memory, intelligence and exports are owner scoped. Migrations 0000–0006 include account_profiles, onboarding_drafts and account_settings. No new migration is introduced by this fix.

## Remaining activation requirements

Production had no Clerk credentials or database URL. The connected Neon organization lists only Atlas Creed, which is unrelated and was not reused. No Clerk management connector is available. Real account creation cannot be enabled or claimed verified without the intended resources.

In Vercel → groomed-gent-collective → Settings → Environment Variables → Production, supply:

- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: the intended Clerk instance's public key, embedded at build time.
- CLERK_SECRET_KEY: the matching instance's server key.
- DATABASE_URL: the intended Collective Neon pooled application connection.

GGC_ACCOUNT_PROVIDER is already set to clerk-neon. For controlled migrations, supply GGC_MIGRATION_DATABASE_URL as the intended database's direct URL in the migration environment. It is not needed in browser bundles or regular runtime. Check existing migration history before applying npm run db:migrate:postgres. Do not apply against Atlas Creed.

Configure verified-email signup/sign-in in Clerk and the app origin/redirects. Google/Apple appear only if enabled with the provider's required credentials. After configuration and migration, rebuild production, then exercise real signup, email verification, onboarding, saved settings, refresh/reopen, logout, denied private access and re-login with the same profile. A deployment without these credentials only verifies the access gate, not the full acceptance test.
