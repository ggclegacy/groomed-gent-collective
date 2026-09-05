# Product Studio — local first pass

Entry: existing Collective navigation → **Product Studio** (`/#knowledge`). The existing hash is retained for compatibility. This is part of the public device-local demonstration, not a new private member route. No confidential founder data should be added to the client bundle. The existing account-backed Creator Studio remains unchanged.

## Implemented

- Searchable Product Vault with nine category filters and four explicitly unverified concept records from the supplied Product Studio Research conversation: Legacy Reserve, HYDROS, ASCEND, NOCTURNE. The repository contained no verified catalog or product imagery. Abstract monograms represent records, not final packaging.
- Product Rooms with all twelve requested sections, source-aware fact rendering, ingredient learning structure/actions, product-aware content briefs and Atlas context.
- Ingredient contracts cover purpose, evidence, synergies, takeaways, plain-language explanations and deep dives. No ingredient names, quantities or benefits were invented. Empty formula state is intentional.
- Persistent contextual Atlas panel within Product Studio, role/product selection, prompt actions and a controlled retrieval preflight. No provider request or generated answer is simulated.
- Claims policy categories GREEN/GOLD/RED with no fabricated approved claims. Exact approved channel and GOLD qualification checks; RED is excluded from publishable claims.
- Eight role-specific Sales Lab scenarios, three-turn local customer practice, customer/difficulty selection, transcript, five-dimension reflection report and retry. Feedback is explicitly deterministic and qualitative; no AI scores or certification are fabricated.
- Recommendation intake for category, use case/gifting, USD budget and customer context. Verified catalog/price screening returns no recommendation for concept records. Free-text interpretation and personalized suitability reasoning await AI integration.
- Two-product comparison table across six requested dimensions. Unsupported facts remain unavailable; no competitor attacks or invented price rationale.
- Three-question editorial microlearning lesson with retry and device-local completion. Four certification levels and per-product unassessed mastery. No artificial earned ranks. The first lesson is fixed; daily rotation requires additional reviewed modules.
- Eight content format briefs with relationship capture, knowledge version, required disclosure review, copy action and a link to existing Creator Studio. Briefs are not auto-imported into or allowed to overwrite existing creator drafts. No publishing occurs.
- Responsive forest/obsidian glass surfaces, gold accents, keyboard-operable controls, native choice primitives, evidence disclosures, labeled fields, reduced-motion behavior and mobile Atlas expansion.

## Canonical knowledge boundary

`lib/product-knowledge.ts` is the Product Studio source of truth. `KnowledgeBase` owns products, ingredient records, formula references, facts, claims, FAQ, objections, talking points, competitor notes, prices, bundles, evidence sources, disclosure policies, training modules and AI behavior. Revision metadata captures version, approval status, reviewer, last-verified date and provenance. `KnowledgeRelease`, `SimulationSession` and `MasteryRecord` define future release history, contextual simulation and assessed progression records.

Concept records carry `concept: true`, draft status and a planning-brief source. They must not become verified simply by relabeling a source. `isVerified` requires approval metadata and approved non-brief sources. `approvedFacts` additionally requires a verified, non-concept product. `allowedClaims` enforces product and claim approval, source provenance, channel and required qualification. `prepareAtlas` rejects stale knowledge/policy versions and returns eligible fact/source IDs, never a fictional answer. Even when evidence exists, it reports provider-offline.

These are local domain gates and contracts, not production security or a regulatory compliance determination. Before adding a provider, implement the same policy on an authenticated server: resolve canonical records there, ignore client-supplied approval/fact lists, minimize retrieval, enforce channel-specific claims and qualifications, verify citations and generated assertions, and abstain when unsupported. Never send draft, retired, prohibited or confidential admin material as answerable product knowledge. Evidence for an ingredient must not automatically substantiate a finished-product claim.

## State and persistence

Vault filters, room context, Atlas questions, practice sessions, content briefs and recommendation intake are in-memory. Product context/role persists across Product Studio destinations; practice resets when product/role changes. Leaving the section or reloading resets unsaved session work. No provider sees user input.

Only completed editorial learning is saved to `ggc.product-learning.v1`, with knowledge and lesson versions. Invalid records are not overwritten; a changed knowledge version invalidates old completion. Browser progress cannot grant membership or certification. Future mastery requires authenticated, server-owned assessments and reviewed curriculum. Do not store private founder knowledge in this public preview or treat local storage as authoritative account data.

## Files created or edited by this work

Created:
- `components/product-studio.tsx` — integrated interactive workflows.
- `lib/product-knowledge.ts` — canonical contracts, concept seed, safeguards and local training logic.
- `app/product-studio.css` — scoped Product Studio visual system and responsive behavior.
- `tests/product-knowledge.test.ts` — eight domain tests.
- `docs/product-studio.md` — this handoff.

Edited:
- `components/collective.tsx` — Product Studio sidebar/home labels and workspace integration.
- `app/globals.css` — imports scoped styles.
- `package.json` — includes new component in application lint.
- `README.md` — links this handoff.

Generated local build/cache outputs are not source deliverables. The repository has no tracked baseline; its existing files are untracked, so Git cannot provide a meaningful before/after diff. Existing unrelated files were preserved. No dependencies, credentials, production settings or migrations were changed.

## Validation

- Typecheck passes.
- 27 tests pass, including eight new Product Studio tests and existing isolated account/database tests.
- Application lint passes, including Product Studio.
- Production build passes. Existing Vite JSON import, plugin timing and route-classification notices remain.
- Full-project lint still reports 19 existing findings in untouched UI primitives and `hooks/use-mobile.ts`; no blanket suppression was added.
- Existing localhost server returns HTTP 200. Preview opened at `http://localhost:3000/#knowledge`. Browser interaction, visual screenshot and phone-device testing were not performed in this pass; responsive behavior is implemented but needs that verification.

## Next phase

1. Import founder-reviewed specifications, final product names, formula/ingredient records, current prices and product assets, with sources and publication history.
2. Build an authenticated founder review/publish workflow and durable canonical storage, including retirement/revocation and curriculum invalidation.
3. Connect Atlas on the server with product/ingredient retrieval, citation validation, claims enforcement, disclosure policies and adversarial abstention tests.
4. Add adaptive multi-turn customer simulation and an evidence-grounded evaluator with qualified scoring and coaching.
5. Connect reviewed training modules, per-product assessments and mastery to member accounts. Add daily scheduling/rotation and durable practice history.
6. Carry structured product/version/claim context into account-backed Creator Studio drafts and review/export workflows.
7. Perform browser/phone accessibility, interaction and visual QA before release.

Nothing was deployed, committed, pushed or migrated.
