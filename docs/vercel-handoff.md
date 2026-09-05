# Next.js / Vercel handoff — September 5, 2026

## Import settings

| Setting | Value |
| --- | --- |
| GitHub repository | `ggclegacy/groomed-gent-collective` |
| Production branch | `main` |
| Framework preset | **Next.js** |
| Root directory | `.` (repository root) |
| Node.js | **24.x** (also declared in package.json) |
| Install command | `npm ci` |
| Build command | `npm run build` (`next build`) |
| Output directory | Framework default; `.next` (do not set `dist` or `dist/client`) |
| Environment variables | None required for the public preview |
| Database migrations | None required for the public preview |

`vercel.json` explicitly selects Next.js and the npm install/build commands. Next.js 16.3.4 is pinned in the npm lockfile. No deployment has been performed by this migration task. Neil can import the repository and deploy when ready.

## What works on Vercel

The existing public app, responsive visual design, Product Studio, knowledge corpus and Creator Studio use the standard Next.js App Router. Device-local drafts and preferences remain in browser storage. Each phone/browser has its own storage; export drafts to transfer them. The existing CSS and all knowledge/source files are retained.

The `/membership` and `/members/studio` pages load, but production member authentication and account-backed persistence remain explicitly unconfigured. `/api/account` returns a private, noncached readiness response. Private account reads/writes return 503 rather than accepting unauthenticated data or claiming to save it. The Vercel runtime ignores client-supplied Sites identity headers and does not read Sites identity environment settings.

A real identity provider and durable account database still need to be integrated before member accounts can operate on Vercel. The migration does not invent credentials, enable mock production sign-in, or store account records on Vercel's ephemeral filesystem. No AI model, checkout, commerce tracking, or email provider has been connected.

## Preserved Sites development path

The Cloudflare implementation remains in `lib/account-runtime.sites.ts`. The Vite configuration substitutes that account runtime only for Sites builds. Use:

```sh
npm run db:migrate:local
npm run dev:sites
# Optional Cloudflare build and local production preview:
npm run build:sites
npm run start:sites
```

The original D1 schema and `drizzle/0000_massive_captain_cross.sql` migration are preserved. `db:migrate:local` is local-only; no remote database was created or migrated. `.wrangler` state stays on this computer and is excluded from Git. The Sites-only `GGC_IDENTITY_MODE` and `GGC_OWNER_ID` settings are not Vercel authentication options.

## Validation

- Clean isolated `npm ci`: passed, zero reported dependency vulnerabilities.
- Clean Next.js production build, typecheck and all 41 tests: passed.
- Application lint: passed. Full-project lint retains the same 20 existing findings (scaffold/hooks and an unused index-script import); no rules were suppressed.
- Production HTTP checks: `/`, `/membership`, `/members/studio` and their generated assets return 200; unknown routes return 404.
- Account readiness is private/noncached; forged Sites headers do not authenticate; unconfigured private reads/writes return 503.
- Preserved Sites production build: passed; inspected output includes the original Worker bindings. Its existing Vite warnings remain.
- Typecheck regenerates Next.js route types first, allowing checks after a Sites build without stale generated route declarations.
- No Vercel deployment or browser/phone interaction test was performed.

## References

- [Next.js installation and standard commands](https://nextjs.org/docs/app/getting-started/installation)
- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
