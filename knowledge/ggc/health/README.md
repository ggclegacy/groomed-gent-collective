# Cassius health research foundation

36 domains · 144 modules · 1,152 specific topics · Foundation / Mastery / Advanced / Frontier.

Start with `taxonomy.json` and `domains/H01.json`–`H36.json`. These are authoritative editorial research assignments, not scientific facts. `catalog.json` and `docs/cassius/health/curriculum.md` are generated planning outputs. Learning level, evidence state, clinical scope and commercial approval are separate.

`claims.json`, `research-sources.json` and `assets.json` intentionally begin empty. Use the eight strict schemas and eight dossier templates to ingest reviewed evidence later. Fourteen source seeds are discovery pointers only. No health claim or GGC product claim is newly approved.

`evidence-policy.json` defines review and scope rules. `ingestion-roadmap.json` defines phased research and acceptance criteria. Domain `groomingDomainIds` links to existing grooming domains; it does not transfer efficacy evidence between different substances, routes or products.

Regenerate with `node scripts/build-health-catalog.mjs`; verify with `node scripts/validate-health.mjs` and the project's tests. Keep personal health information and confidential manufacturer evidence outside static records. See `docs/cassius/health/architecture.md`, `consultation-framework.md` and `ingestion-roadmap.md` for the full handoff.
