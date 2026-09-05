# Cassius Men's Grooming Intelligence

Version 1.0.0 · 2026-09-05. This extends the existing GGC registry; it does not replace product identity, brand facts, approvals or safety policy.

The original 18 subject domains plus consultation intelligence form **19 domains, 76 modules and 608 specific topics**. Each domain file contains Foundation, Mastery, Advanced and Frontier modules, topic research questions, outputs, prerequisites and explicit unassessed evidence metadata.

Start with `taxonomy.json`, then `domains/D01.json` through `D19.json`. `catalog.json` is a compact generated planning index imported by Cassius. `claims.json` is intentionally empty. `source-seeds.json` contains discovery pointers, not reviewed scientific evidence. `evidence-policy.json` separates workflow, provenance, evidence strength and professional scope.

Schemas and templates are under `schemas/` and `templates/`. Research sources must be licensed or permission-compatible; confidential manufacturer records and consultation health details remain outside the browser corpus. See `docs/cassius/grooming/` for the curriculum, ingestion roadmap and consultation framework.

Run `node scripts/validate-grooming.mjs` and the project's normal tests before release. Regenerate planning output with `node scripts/build-grooming-catalog.mjs` after domain edits. Do not hand-edit the generated catalog or curriculum document.
