# Health research ingestion roadmap

The infrastructure is complete; authoritative source ingestion is the next program of work. All 1,152 topics start PLANNED / UNASSESSED. The health claim, research-source and asset registries are empty. Fourteen source-discovery pointers are not a reviewed medical corpus.

## Research order

| Phase | Focus | Exit requirement |
|---|---|---|
| P0 | Evidence literacy, consultation scope and governance | Real reviewers assigned; boundary and privacy cases accepted |
| P1 | Physiology, prevention, nutrition, exercise, sleep, mental wellbeing, access and sensory health | Foundation/practical dossiers and care-navigation cases reviewed |
| P2 | Metabolic, cardiovascular, neurological, organ-system and medication literacy | Clinical and methods appraisal; harms and applicability captured |
| P3 | Endocrine/testosterone, reproductive health, supplements and biomarkers | Identity-specific evidence and clinical scope reviewed |
| P4 | Wearables, recovery, exposure and substance-use evidence | Measurement validity, adverse effects and limitations addressed |
| P5 | Longevity, peptides, biologics and experimental biohacking | Human/preclinical distinction, regulatory status and surveillance review |
| P6 | Reviewed retrieval and GGC product mapping | Applicability checks, exact formula evidence and separate commercial approval |

Module prerequisites always take precedence over phase grouping. P0 may acquire foundational prerequisites from later groups to calibrate policy. The first batches and exact IDs are in `ingestion-roadmap.json`. Progress Foundation → Mastery → Advanced → Frontier within domains. Frontier inclusion does not imply endorsement or inevitable future adoption.

## Source strategy

The discovery registry records exact URLs and domain mappings checked by web search on September 5, 2026. Retrieve the actual document, check its currency and permissions, then inspect full text and underlying evidence. Initial entry points include:

- [USPSTF recommendation topics](https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics) and [NCI cancer screening](https://www.cancer.gov/about-cancer/screening) for prevention research.
- [NIDDK health information](https://www.niddk.nih.gov/health-information/) for metabolic, digestive, kidney and urologic reference discovery. Its entry point warns that information is not being updated regularly; corroborate current guidance at document level.
- [Endocrine Society testosterone guideline](https://www.endocrine.org/clinical-practice-guidelines/testosterone-therapy), its [2026 statement](https://www.endocrine.org/news-and-advocacy/news-room/2026/statement-on-testosterone-replacement-therapy), and the [AUA guideline directory](https://www.auanet.org/guidelines-and-quality/guidelines) for endocrine and reproductive research.
- [NIH ODS fact sheets](https://ods.od.nih.gov/factsheets/list-all/) and [exercise-performance evidence overview](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/) for supplement-specific source discovery.
- [Physical Activity Guidelines overview](https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines/top-10-things-know), [NIMH men's mental health](https://www.nimh.nih.gov/health/topics/men-and-mental-health), [NIA healthy aging and longevity](https://www.nia.nih.gov/health/topics/healthy-aging-and-longevity), and [NHLBI lung health](https://www.nhlbi.nih.gov/health/lungs/lung-health).
- [FDA July 2026 compounding committee materials](https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026) and the [FDA compounding safety-risk reference](https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks). Read exact substance, route, policy category and date; advisory discussions do not establish final approval or clinical benefit.

Expand with current specialty guidelines, systematic reviews and their included trials, clinical trial registries, drug/device labeling, licensed clinical references, occupational guidance, nutrition/exercise professional statements and primary research. Dedicated source acquisition remains necessary for wearables, oral/sensory care, addiction, global regulatory contexts and domains without a discovered seed. Commercial clinic claims, podcasts and influencer narratives can be research questions or misinformation examples; they are not preferred substantiation.

## Per-topic workflow

1. Select a stable topic ID, prerequisite module and research question. Define the population/intervention/comparator/outcome where applicable.
2. Acquire source metadata: title, version, publication/access dates, publisher, jurisdiction, rights, correction/retraction check and permitted snapshot/hash. Keep confidential evidence outside public imports.
3. Extract atomic claims with exact locators and short excerpts. Capture design, sample, population, life stage, anatomy, health context, exposure, route, duration, comparator, patient-important and surrogate outcomes, effects, harms, uncertainty and funding.
4. Record contradictory findings and generalizability limits. Grade evidence independently from regulatory status, practice scope and marketing authorization.
5. Populate a template and place the resulting dossier in `assets.json`, with source/claim references. Do not put an unfilled template in a released registry.
6. Obtain accepted domain-specialist, evidence and clinical review. Use at least two distinct reviewers. Add jurisdiction-specific regulatory and brand approvals where applicable. Reviewer identities and credentials must be real; an automated review label is not an attestation.
7. Validate all schemas, references, dates, applicability and permissions; test abstention, sensitive topics, conflicting evidence and exact GGC product identity. Publish only reviewed public summaries.
8. Implement applicability-aware retrieval before enabling health knowledge answers. Preserve scope/harms in bounded context; never remove safeguards to fit a prompt. Record a release/changelog, retain rollback material and withdraw dependent claims when sources change.

## Maintenance

Editorial review defaults are 365 days for fundamentals, 180 for daily practice, 90 for clinical/intervention/governance topics and 30 for frontier topics. Dates are scheduling defaults, not guarantees of validity. Retractions, safety alerts, new contrary evidence, revised guidelines, assay changes, product/formula changes and regulatory actions trigger reassessment immediately. Expired evidence remains withheld until review.

Track topic acquisition/appraisal/release by domain and level, source currency, unresolved conflicts, clinically meaningful outcomes, review expiry, citation accuracy, unsupported-answer rate, referral appropriateness, fairness and commercial identity mismatches. No scheduled monitoring was created.

## Remaining implementation after ingestion

Appoint reviewers; acquire/licence source packs; populate claims and dossiers; obtain exact GGC formula/manufacturer evidence; implement population- and exposure-aware retrieval; validate with domain/clinical experts; test generated answer fidelity; and only then consider richer consent-based intake or personalization. The current answer service and account system remain separate existing capabilities. This extension does not add a patient database, lab interpretation service or treatment engine.
