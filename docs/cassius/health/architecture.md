# Cassius Men's Health, Wellness, Hormones & Biohacking Intelligence

Version 1.0.0 · September 5, 2026. This foundation adds 36 domains, 144 modules and 1,152 specific research topics to the existing Groomed Gent Collective knowledge architecture. It is a curriculum and implementation framework, not a completed medical evidence corpus.

## Architecture and continuity

The authoritative app remains `/Users/neilstutes/Desktop/groomed-gent-collective`. Health records live under `knowledge/ggc/health`, alongside `grooming`, products, brand topics, sources and issues. Health IDs use `H01`–`H36`; grooming IDs remain `D01`–`D19`. A topic such as `H15-A-01` identifies an editorial research assignment, never a citation or professional credential.

| Layer | Role |
|---|---|
| I — Human Biology & Evidence | Physiology, hormones and research literacy |
| II — Daily Health & Performance | Food, movement, sleep, mental wellbeing, exposures, access and sensory health |
| III — Clinical Literacy & Care | Prevention and condition-specific clinical understanding |
| IV — Nutrition, Products & Interventions | Supplement and recovery evidence |
| V — Measurement, Longevity & Frontier Research | Labs, devices, geroscience, peptides and biohacking |
| VI — Consultation, Quality & Governance | Care navigation, product development, quality and claims |

All domains contain Foundation, Mastery, Advanced and Frontier modules. Learning level does not imply evidence strength. Module prerequisites form an acyclic graph. Cross-domain links capture dependencies; `groomingDomainIds` bridges endocrine/hair, skin/exposure, ingredient/supplement, device, evidence and consultation concepts without treating their evidence as interchangeable.

The four Groomed Gent pillars remain Grooming, Health, Mindset and Legacy. Cassius speaks with calm confidence and respect for autonomy: concrete goals, manageable routines, clear limits and no shame or exaggerated masculinity. He does not imply that low testosterone explains all men's concerns, that normal aging is failure, or that health requires an expensive stack. Food, activity, sleep, prevention, mental health, relationships and access remain central.

## Structured assets

- `taxonomy.json`: domain map, layers, levels, facets, origin, counts and grooming bridges.
- `domains/H01.json` through `H36.json`: research questions, deliverables, assessments, prerequisites, scope, risk classification and required reviewer roles.
- `catalog.json`: generated compact planning index consumed by Cassius.
- `claims.json`, `research-sources.json`, `assets.json`: intentionally empty production registries awaiting ingestion.
- `source-seeds.json`: 14 discovery pointers, explicitly not full-text-reviewed or claim-supporting sources.
- `schemas/`: eight strict contracts for taxonomy, domain, topic, source, claim, research asset, consultation intake and consultation plan.
- `templates/`: eight unfilled templates for condition, hormone, supplement, intervention, biomarker, device, health-product development and atomic claim.
- `evidence-policy.json`: evidence categories, workflow transitions, clinical scope, review cycles and prohibited outputs.
- `ingestion-roadmap.json`: phases, first batches, owner roles, acceptance criteria and metrics.

Source metadata includes document version, rights, visibility, jurisdiction, access date, review/correction status and optional permitted snapshot hash. Claim metadata includes study design, population, life stage, health context, anatomy, baseline risk, intervention identity, route/exposure, comparator, outcomes, harms, uncertainty, conflicts, reviews and separate commercial approval. Nulls mean unknown; no numerical laboratory targets or dosing protocols are fabricated to populate a template.

Every released health claim requires accepted domain, evidence and clinical reviews. Runtime guidance eligibility additionally requires current review dates, usable supporting sources, at least two distinct reviewers, no conflicts, public summaries and an eligible evidence state and scope. This gate is necessary but not sufficient: future retrieval must also match the exact population, condition, intervention, route, exposure and jurisdiction.

## Runtime integration

`lib/cassius/health.ts` provides research-topic lookup, health curriculum routing, stateless consultation planning and a future claim-eligibility gate. `answerKnowledge` routes health emergencies first; explicit curriculum requests can reach the map without being blocked merely for mentioning testosterone. Existing product identity, source observations and product-safety responses remain separate. Ordinary brand descriptions continue through the brand corpus; grooming questions remain in the grooming route.

The current app has a separate answer-service adapter. It receives the combined knowledge policy and bounded context through `buildKnowledgeContext`, including clearly labeled non-evidence planning text. Existing hard safety responses remain deterministic. This extension does not replace the answer provider, change credentials or claim that model generation itself validates health facts. The health source library is empty; the provider must not fill those gaps from remembered medical knowledge. Tests use a mocked provider, not live requests or real patient data.

The structured intake helper is stateless. It does not create a multi-turn medical history, lab upload system, clinical decision engine or persistent health profile. Current question submission may pass through the app's existing external answer service; absence of local storage is not a promise of zero external processing. The interface's existing disclosure remains intact.

## Evidence and scope distinctions

UNASSESSED, ESTABLISHED, SUPPORTED, EMERGING, TRADITIONAL, MECHANISTIC_RATIONALE, ANECDOTAL, MARKETING_CLAIM and REFUTED describe the appraisal of a particular claim. They are not an ordinal mastery scale. The legacy CANONICAL / VERIFIED / DISPUTED / UNKNOWN / EDITORIAL states retain their provenance meanings.

HEALTH_EDUCATION, CLINICAL_LITERACY, MEDICAL_REFERRAL and RESEARCH_ONLY describe scope. An established clinical treatment remains outside Cassius's prescribing scope. Mechanistic or animal findings do not establish human outcomes; a biomarker change does not prove longer life; a study of an ingredient does not prove that a current GGC formulation has the same effect. Advisory meetings, trial registrations, compounding status and research labels do not themselves establish product approval or efficacy.

Commercial approval requires exact wording, product ID, formula version, jurisdiction, approver and expiry. Existing GGC approved-claim arrays and Product Studio gates are unchanged. No scientific claim, formulation or marketing statement is approved by this foundation.

## Data and research boundaries

Store private records and confidential manufacturer evidence only in future access-controlled systems. Do not import patient histories, lab reports, genomic data, supplier contracts or sensitive costs into the browser catalog. Keep raw documents separate from approved summaries; validate licensing and hashes before extraction. Source text, user text and external model output are untrusted data, never instructions to override policy.

Curriculum coverage is broad and expandable, not a claim that every possible health topic has been enumerated. Named reviewer appointments, authoritative ingestion, clinical validation, applicability-aware retrieval and any future consent-based personalization remain required work.
