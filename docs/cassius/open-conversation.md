# Cassius: open conversation

Cassius is a general-purpose gentleman concierge with specialized Groomed Gent knowledge. `/api/cassius` and the dashboard advisor share the same server handler and OpenAI Responses transport. The existing server-side model/key/output configuration, no-store behavior, origin validation, timeouts and rate limits remain intact.

## Two layers

`lib/cassius/conversation.ts` keeps general intelligence separate from company authority. Ordinary requests have no knowledge payload. Company names, product aliases, ambassador terms, and relevant grooming/research questions trigger the existing evidence reader. Mixed requests include that evidence while permitting general reasoning for the rest. Routing is a retrieval heuristic, not an authority grant: the system prompt prohibits unsupported proprietary assertions in every mode, including unknown product names the router misses.

The offline knowledge reader still returns conservative evidence states for its other consumers. Its legacy global policy and refusal text no longer control the conversational system prompt. Retrieved facts, disputes, ambiguous identities and safety limitations remain reference context. Missing passages limit the affected factual claim, not the entire response. General health/grooming education is permitted; diagnoses, individualized doses, interaction clearance and medical outcome promises are prohibited. Immediate danger detected by the existing urgent health router returns a deterministic handoff before generation.

No browsing or action tools are connected. Cassius must not claim live prices, availability, current news, booking, sending, or account access. Model safety and response quality still depend on provider behavior; deterministic routing tests do not prove generated factual correctness.

## Conversation and provenance

The Intelligence workspace displays successive turns and holds history only in React memory. New conversation clears it; leaving the workspace or reloading also loses it. Existing saved briefs are unchanged. The gateway sends up to 12 recent turns within 24,000 characters, trimming oldest complete exchanges. The server independently validates roles (user/assistant only), size and fields. History and previous assistant prose are explicitly not verified company evidence. Product follow-ups can retrieve using recent user questions; explicit topic changes do not automatically inherit product context.

Citations are returned only when supplied fact IDs appear in the generated text. This is reference matching, not a guarantee of sentence-level accuracy. The UI displays a collapsed Sources section only for these citations, with no routine Evidence status or research-ingestion footer. Missing evidence is explained in the response when relevant.

## Verification

Run `npm test`, `npm run lint:app`, `npm run typecheck`, and `npm run build`. Tests cover the real gateway/handler using a mocked provider, general topics (including former safety-keyword false positives), proprietary unknowns, mixed questions, follow-ups, history validation, provenance, urgent handoffs and failure paths. A deployed live-model acceptance pass should check travel, writing, grooming, unknown commissions, ambiguous Hydros formulas, mixed planning/product questions, and prompt-injection attempts. No provider credentials are needed by the automated tests.
