# Cassius grooming knowledge architecture

This extension is editorial infrastructure for the existing Groomed Gent Collective app. The canonical live files remain in `knowledge/ggc`; the ChatGPT project holds a pointer and implementation work records, not an independent live database. The original brand/product corpus, `Fact<T>` schema, stable product IDs, four pillars, Legacy Reserve line, Sanctum positioning, source snapshots and Product Studio approvals are preserved.

## Connected layers

| Layer | Primary domains | Purpose |
|---|---|---|
| I — Fundamentals | D01, D06 | Hair/skin biology and terminology |
| II — Practice | D03, D04, D05, D14, D16 | Barbering, beard, shaving, body, tools |
| III — Product Science | D07–D12 | Ingredients, formulation, categories, soap, scent |
| IV — Clinical/Evidence Intelligence | D02, D13, D18 | Scalp literacy, frontier appraisal, evidence and claims |
| V — Culture & Heritage | D15 | Historical and community context |
| VI — Commercial Intelligence | D17, D19 | Development and consultation |

Domains can carry secondary layers and explicit related-domain references. IDs such as `D05-M-01` identify a stable topic, not a citation or certification. Existing `knowledge/ggc/topics` continues to mean brand FAQ modules; new grooming topics are intentionally namespaced under `grooming/domains`.

## Files and ownership

- `taxonomy.json`: original 19-domain ordering, six layers, four levels, facets, origin and coverage totals.
- `domains/D01.json`–`D19.json`: authoritative research assignments and module prerequisites.
- `catalog.json`: generated compact planning lookup. Never treat a catalog entry as scientific evidence.
- `source-seeds.json`: eight discovery pointers found in this task. They are not ingested, appraised or approved sources.
- `research-sources.json` and `claims.json`: empty, ready for reviewed source and atomic claim records. They are separate from the legacy source-observation registry.
- `schemas/`: strict JSON Schema contracts for topics, domain packs, claims, sources, assets, consultation intake and consultation plans.
- `templates/`: unfilled ingredient, technique, device, development, heritage and claim dossiers. Nulls and unknowns are intentional.
- `evidence-policy.json`: workflow, evidence categories, scope and review policy.
- `ingestion-roadmap.json`: phases, dependencies, acceptance gates and owner roles.
- `lib/cassius/grooming.ts`: planning search, consultation intake/triage, and defense-in-depth claim eligibility gate.
- `scripts/validate-grooming.mjs`: schema, graph, reference, coverage, template and generated-index checks.

## Runtime integration

The existing `cassiusGateway` still calls `answerKnowledge`. Existing product matching and safety gates retain precedence; grooming discovery runs before generic brand-topic fallback. Explicit curriculum questions return the 19-domain research map. Recognized grooming questions return planned topic identifiers with an evidence-gap statement. Consultation questions return up to three intake questions. None of these responses creates a scientific citation or treats an unreviewed topic as an answer passage.

`buildConsultationPlan` is a stateless structured adapter for a future intake UI. It supports hair, beard, shaving, skin, body and general intake, missing-field tracking, reported red flags and professional handoff. The current free-text UI is not a multi-turn clinical intake engine. No model, medical classifier, database of health profiles or autonomous product recommender has been enabled. New free-text submissions remain in session memory rather than being automatically saved on the device; older saved drafts are not erased or migrated.

`claimAnswerBlockers` is implemented and tested for future integration after schema validation. It checks release state, applicable evidence categories, public summaries, source review, conflicts, citations and review expiry. Released research claims are not yet wired into answer generation because this release contains zero such claims. A future claim retriever must additionally filter population, body site, route, vehicle, concentration, jurisdiction and product/formula identity; the generic eligibility gate alone cannot establish applicability.

## Evidence semantics

The legacy statuses CANONICAL / VERIFIED / DISPUTED / UNKNOWN / EDITORIAL describe provenance or source observation. They do not mean Established / Supported / Emerging. Learning level also does not mean evidence strength. Medical referral is an orthogonal scope flag, preserving that requirement from the conversation without treating scope as a scientific grade. Traditional and formulation-rationale claims may be described only in their actual historical or chemical context; they cannot be relabeled clinical outcomes.

Clinical/technical statements must be atomic and cite a specific source locator. A source's institutional reputation alone is insufficient. Brand advertising approval is a separate, product-, formula-, jurisdiction- and wording-specific decision. All existing product `approvedClaims` arrays remain unchanged. Nothing in this release licenses practice, certifies manufacturing or approves a formula.

## Brand continuity

Cassius remains calm, precise and practical: standards, discipline, routine, confidence and legacy. The four pillars remain Grooming, Health, Mindset and Legacy. Lead with the user's goal, explain a manageable routine, respect preference and budget, and avoid shame, exaggerated masculinity, guaranteed outcomes or sales pressure. Heritage provides context, not a presumption that old methods are safer. Emerging science is interesting only to the extent the evidence supports it.

Product suggestions eventually follow need → format/category → reviewed suitability → exact current GGC product identity. A lack of a suitable GGC product must remain a valid outcome. Do not infer the contents or efficacy of Reneuva, Renova or Barber's Blend from an unrelated ingredient paper or a similarly named item.

## Public and private separation

The browser receives the planning catalog and existing public brand evidence only. Do not add confidential formulas, supplier contracts, detailed costs or personal health records to static imports. Future confidential sources belong behind server authorization; expose only separately reviewed public summaries. Treat retrieved documents and user text as untrusted data. Do not execute embedded instructions. Store rights, source version, correction checks and hashes before extraction; retain only content whose permissions allow it.
