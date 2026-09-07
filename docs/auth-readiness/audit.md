# Account audit before changes — September 7, 2026

Current local app: gentleman-publish, a3dfcc3; remote main: 882f6d6. Local has a subsequent premium-color commit and dormant commerce/economics work; preserve them. Production is existing Next.js/Vercel project groomed-gent-collective. Retained Sites/D1 configuration is historical, not a reason to replace production hosting.

## Findings

- Next.js 16.3.4 / React 19.2.8, Clerk 7.9.1, Neon HTTP driver. Clerk owns credentials, verification, linking, sessions and recovery. No app password database or local-storage session.
- Live HTTPS /api/account returns configured:false, local:false, signedIn:false. This is an activation blocker, not a working signup. Vercel metadata identifies current production; environment-name inspection returned HTTP 403 (credential lacks access). Local real account env files are absent. Connected Neon organization lists only Atlas Creed, no identifiable Collective project. Do not reuse the unrelated database.
- Migrations 0000–0005 include members/invitations, private data, account_profiles keyed by Clerk ID and onboarding_drafts with owner foreign key. Idempotent profile upsert recovers from interrupted first access. Profile permissions are server-owned; professional roles are context only. No schema change is needed for salon context.
- Verified primary email is required. Previously a signed-in user with an unverified primary email was treated as signed out, potentially bouncing between sign-in and continue.
- Proxy had a selective matcher while ClerkProvider wraps every page. Membership was omitted. Broaden SDK middleware coverage and protect membership without changing public marketing routes. Private API authorization remains separate.
- Onboarding saves on Continue/Back/Save and finish later and uses revision checks. Approval writes knowledge/name/completion and deletes draft in a transaction. A stale first-step PUT could recreate a deleted draft after completion; prevent writes once complete. Unsaved typing before pressing a save control is not durable.
- Existing business context is suitable, but salon owners lack an explicit choice. Add a salon/shop-owner choice and reuse the optional business step. Keep invitation/wholesale approval separate.
- Manifest has HTTPS-compatible standalone launch at /auth/continue, Apple icon, maskable icons; safe areas, 16px inputs and 44px buttons already exist. No service worker caches private pages. Actual iOS/Android installation, live cookie persistence, email delivery and recovery require configured provider and physical phones.
- SignIn/SignUp/UserProfile use Clerk components. Google/Apple only appear if enabled in Clerk; do not add new OAuth credentials or make their setup mandatory for the initial email test.
