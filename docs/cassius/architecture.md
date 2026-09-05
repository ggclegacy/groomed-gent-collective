# Architecture and integration

## Current runtime extension

The evidence architecture below remains the retrieval foundation. The Intelligence UI now calls `/api/cassius`, whose server-only OpenAI Responses adapter reuses this evidence and policy. See [the current runtime architecture](openai-runtime.md). The original local-only gateway description below documents the preceding checkpoint.

## Inspected baseline

The existing Vinext/React app exposed CollectiveGateway.askIntelligence and getProducts in lib/collective.ts. Both were disconnected placeholders. No vector database, embeddings, AI provider, retrieval service, context assembler or existing approved catalog existed at inspection. The question workspace only saved a local question. Account/invitation/Studio storage and the new visual material system already existed and are preserved. A concurrent Product Studio implementation adds its own draft/concept and approval contracts. Those are not silently promoted.

## Layers

1. Evidence archive: dated public HTML-to-text snapshots and public Shopify JSON, SHA-256 hashes, original/resolved URLs and retrieval times. This is audit material; raw website text is never injected into answers. Failed sources remain in the manifest.
2. Entity registry: 18 stable products, Shopify IDs, catalog handles, aliases, line/family/flavor. Hydros flavors are separate products. Nexus NAD+ is distinct from Vitalis NMN. Reneuva is distinct from Renova. Legacy Reserve is a line.
3. Field facts: separate ingredient declarations, serving, supplement rows, excipients, blend membership, directions, protocols, warnings, purpose, prices and pairings. Every non-unknown field has source/locator metadata. UNKNOWN uses null plus a reason; never an empty string pretending to be data.
4. Topics: identity, pillars, Reserve, Sanctum, founder story, voice, sales, FAQs, wholesale/ambassador, safety, network and governance. Editorial guidance remains visibly distinct.
5. Issues: conflicting observations and required resolution, with affected products/fields. Disputes remain available to retrieval, with caution, instead of choosing a convenient value.
6. Retrieval: deterministic alias matching, flavor clarification, topic ranking and field selection. Answer passages expose status, fact ID, source, locator, authority and review date. Unknown requests abstain. Policy checks refuse medical clearance and dose escalation. Responses never echo arbitrary raw source instructions.
7. Gateway/UI: cassiusGateway implements the existing askIntelligence contract independently of commerce and AI. The existing Cassius form displays actual source evidence and source links; storage failure does not prevent retrieval. No credential, network API or database write is required. demoGateway remains disconnected for original demo contracts.
8. Future generation: buildKnowledgeContext provides bounded policy plus provenance-bearing passages. If all required context cannot fit, it requests a narrower question instead of truncating safety. A future server-side provider must re-run retrieval and output validation; browser-supplied context is never authoritative. No live model is enabled in this release.

## Trust semantics

CANONICAL = identity/architecture adopted for this knowledge release from cited brand/context evidence. It does not certify a formula or approve a claim. VERIFIED = observed statement in a named source, with scope and date. DISPUTED = conflicting unresolved evidence. UNKNOWN = no usable evidence. EDITORIAL = implementation guidance, not a product fact or regulatory conclusion. These statuses are not the Product Studio draft/approved workflow and must not be mapped automatically.

The approvedClaims arrays are deliberately empty. Published purpose language is explicitly website positioning. ManufacturerFormula and product-specific research remain unknown for every product. Product-specific research cannot be inferred from a raw-ingredient study. Ingredient declarations from catalog JSON can contain more detail than rendered pages; both retain separate provenance. Amount strings retain units, nutrient forms and DV markers to avoid lossy conversion (for example 275 mg magnesium from 2,500 mg magnesium glycinate).

## Public/private boundary

Only this public website corpus and non-sensitive editorial guidance are bundled into the browser. Do not put private manufacturer agreements, personal health data, costs, access credentials or confidential founder material into these imported records. Store confidential evidence server-side with access controls and use redacted, approved public facts when extending the browser corpus. No synced project reference file was edited.

## Product Studio compatibility

Product Studio’s four original concept records and approval gates remain intact. Its name Legacy Reserve cannot be treated as a stable product ID for Barber’s Blend. This release’s authoritative registry can support later reviewed mappings; no manufacturer-certified formula or claim approval is fabricated to pass its approval gate. Cassius uses the canonical registry directly. Product Studio approval/certification remains a separate workflow until evidence is reviewed for that purpose.

## Limits

This is a deterministic, auditable evidence reader rather than semantic AI. It handles exact product aliases and curated topic keywords; open-ended conversations or unrecognized wording may request clarification. The safety matcher is defense in depth, not a medical classification system. Output remains constrained to curated facts even when wording evades a keyword. Tests cover retrieval logic and the existing gateway; they do not prove clinical correctness or legal compliance. Price/stock, changing policy and availability must be rechecked at the source.
