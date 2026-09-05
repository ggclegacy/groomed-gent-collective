# GitHub checkpoint and Vercel handoff — September 5, 2026

## Status

This checkpoint preserves the complete existing application, assets, knowledge corpus, tests, and D1 migrations. The repository initially had no commits and the correct origin: https://github.com/ggclegacy/groomed-gent-collective.git. No application files were replaced, no history was reset, and no infrastructure was deployed.

**The current build is Cloudflare-targeted, not yet a deployable Vercel build.** A fresh Vercel import alone will not make this checkpoint runnable. This handoff records the required platform work rather than silently changing the existing database or authentication behavior.

## Verified locally

- Node 24.19.0 with the existing installed dependencies.
- `npm run typecheck`: passed.
- `npm test`: all 39 tests passed, including isolated SQLite migration/API integration tests.
- `npm run lint:app`: passed.
- `npm run build`: passed; produces Cloudflare Worker output under `dist/server` and client assets under `dist/client`.
- `npm run lint`: 20 existing findings (19 scaffold/hook findings and an unused `path` import in `scripts/build-cassius-index.mjs`). No rules were suppressed.
- Build warnings: future Vite JSON import-attribute compatibility, plugin timing diagnostics, and incomplete route classification.
- This was not a clean dependency reinstall or a Vercel build. No phone/browser verification was performed in this checkpoint task.

## New Vercel project requirements

Use repository `ggclegacy/groomed-gent-collective`, branch `main`, root directory `.` and Node 24.x. The lockfile is npm; the installation command is `npm ci`.

The existing `npm run build` runs `vinext build` with the Cloudflare and Sites plugins. The presence of `next.config.ts` does **not** mean the Next.js preset is compatible. There is no current Vercel output directory or verified preset to select. Do not use `dist/client` as a static deployment: the application also has server routes.

Before importing for a working phone preview, add and verify a Vercel-compatible build path. Vinext documents a Nitro Vite adapter for Vercel; alternatively, migrate the build to standard Next.js. Preserve the existing local Sites/Cloudflare path while doing so. The selected adapter determines the framework/output settings. With a standard Next.js migration, use the Next.js preset and `next build`; that migration has not been performed here.

References:
- https://github.com/cloudflare/vinext (deployment targets and Nitro integration)
- https://vercel.com/docs/builds/configure-a-build (framework/build settings)

## Database and identity

`lib/account-runtime.ts` directly imports `cloudflare:workers` and uses the `DB` D1 binding. Vercel does not supply that binding. A Vercel runtime/database adapter is required for account APIs; a database URL environment variable alone cannot fix this.

The included schema is SQLite/D1, with migration `drizzle/0000_massive_captain_cross.sql`. `npm run db:migrate:local` only applies migrations to local Wrangler state. No production database was created or migrated. Local `.wrangler` database contents are intentionally ignored and remain on this computer. Do not apply the SQLite migration unchanged to a PostgreSQL database. Provision and migrate the chosen backend separately after adapting the database layer.

The only application identity configuration currently present is `GGC_IDENTITY_MODE` and `GGC_OWNER_ID`, supplied as Worker bindings. `sites-local` is a localhost-only simulation. `sites-dispatch` requires a trusted Sites dispatcher that strips user-supplied identity headers and prevents direct access. **Neither is a Vercel production sign-in setup.** Do not set these values in Vercel to bypass the missing authentication integration. Configure a real verified identity provider and server-side membership checks as part of the Vercel adaptation; provider-specific environment variable names depend on that choice.

The root experience uses device-local demo storage. Production member services deliberately fail closed until their backend and identity are configured. No live AI, commerce, payment, or email credentials are required for the current demo. An AI model provider is not connected.

## Preserved local files

Dependencies, generated build output/caches, `.env*`, `.vercel`, and local Wrangler database state remain excluded by the existing `.gitignore`. All non-ignored project files, including new assets and knowledge files, belong in the checkpoint. Prior README phase reports describe historical states; this handoff records the current checkpoint verification.
