# Shared GGC Product Brain

## Architecture and source ownership

The app uses Next.js with a retained Vinext/Sites build. D1/Drizzle currently stores members, invitations and draft libraries, not product truth. Cassius reads structured JSON via a deterministic retrieval layer and uses it as context for its OpenAI conversation provider. Creator Studio already calls that same retrieval layer. Product Studio previously had a separate four-concept knowledge object; it now projects the shared catalog and current dossiers while preserving planning concepts and the existing interface.

`knowledge/ggc/product-brain/store.json` is the canonical append-only submission history, including supplied source text, verification metadata and complete revision snapshots. `release.json` is a derived build artifact, never a second editable database. It contains current dossiers and deduplicated ingredient/competitor intelligence, omits raw sources, and is checked against the full history before either production build. No migration or remote database write is required. Intake is founder-operated through the local project workflow; there is intentionally no unauthenticated web write endpoint.

Use `getDossier`, `productCoverage`, `answerProductBrain` and the shared corpus for education, routines, quizzes, product education and future modules. Product Studio and Cassius/Creator retrieval consume projections of these same records. A dossier's unknown fields supersede older observations too; retrieval cannot silently recover an older formula or price. The old website corpus remains an explicitly dated legacy observation source for products that have not yet undergone intake.

## Knowledge layers

1. **GGC:** per-field verified founder/manufacturer records. A website capture is unverified or disputed, even when the site is first-party. Verification requires an explicit reviewer and timestamp, source IDs and exact source quotations.
2. **Ingredient evidence:** versioned shared intelligence with purpose, mechanisms, benefits, limitations, relevance, evidence quality, compatibility and misconceptions. Research cannot populate product facts. Product-context retrieval links this layer only through a verified ingredient membership.
3. **Model reasoning:** interpretation and general education; never verification or permission to add product facts. Conversation instructions preserve this boundary and revision-scoped citations. Prompt grounding is not a guarantee that a generative model can never produce an unsupported sentence; provider output remains subject to normal review.
4. **Competitor:** separately typed/versioned intelligence; excluded from ordinary GGC retrieval. It cannot supply missing GGC facts.

Current ingredient and competitor evidence libraries are empty. No research has been invented or pre-approved. Claim, education, routine, bundle and quiz fields support reviewed source-backed text; this foundation does not auto-author or certify that material. Product Studio’s existing channel-specific marketing-claim and numeric budget recommendation adapters remain conservative: no approved claim or price is inferred from free-text dossier fields.

## One-product intake

1. Preserve the founder’s original message, file or supplied URL capture. A fetched website is a website source, not a founder attestation. Keep private supplier/formula documents out of public application files.
2. Create a blank envelope: `npm run product:brain -- template ggc-product-id`. Required fields: stable product ID, a source-supported official-name observation, source ID/kind/location/capture timestamp/raw material, reason, initial revision and idempotency key. Every unspecified field stays explicit `unknown`/null. An empty ingredient array means no structured list supplied, not ingredient-free.
3. Normalize one product into the envelope. Preserve exact source quotations. Do not infer percentages, INCI names, supplier identities, ingredient roles or fragrance composition from a category/name. Each formulation ingredient entry has a stable ID and separately qualified fields. IDs can link to shared evidence intelligence; never equate similar names automatically.
4. Run `npm run product:brain -- preview /absolute/path/submission.json`. It validates fields, source references, quote presence, layer boundaries and revision expectations, and prints unknown/unverified/disputed fields. Quote matching proves source linkage, not semantic truth: the operator must review the normalized value against the quote.
5. Review that concrete preview, then run `npm run product:brain -- apply /absolute/path/submission.json`. This is a trusted local operator command, not automatic approval by the system. Repeating the identical submission is a no-op; a reused key with changed content or a stale expected revision fails.
6. Run tests/build and release the app through its normal deployment process. Local intake does not automatically modify a deployed instance. The same facts become available to all consumers when that release is built/deployed.

For corrections, copy the current full dossier, increment revision, set previous/expected revision, a new idempotency key, and an explicit reason. Carry forward only intentionally retained fields and their original provenance. Reuse unchanged source IDs; changed source material must get a new source ID. New source statements never silently promote earlier observations. Reformulations additionally require a distinct, explicitly supplied formula version. Historical revisions and source text remain in the store.

The writer uses an exclusive local lock and atomic file replacement. If interrupted between store and index writes, the mandatory build check rejects the stale index; `reindex` repairs it from history. A lock left by a terminated process requires checking that no intake is active before removing it. This workflow is suitable for one founder/operator; multi-host concurrent administration would require a transactional server store before adding a remote admin UI.

## Product #1

Barber’s Blend URL intake is revision 1. See `barbers-blend.md` for the human review and `existing-data-audit.md` for all preexisting records. Twelve website-listed ingredients are preserved, but the current formula is disputed because the page also lists eleven. No concentrations, complete INCI, formula version, suppliers, safety advice or advertising claims have been fabricated.

## Verification

The product-brain tests cover schema/unknown validation, source quotations and immutability, rejected cross-layer promotion, idempotency, stale updates, correction history, reformulation requirements, current-record retrieval precedence, follow-up grounding, missing information, safety routing, context overflow, source stripping and shared Studio projection. Existing app tests remain part of validation. Raw snapshot hashes are retained beside the captured page and product JSON.
