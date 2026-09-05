# Cassius OpenAI runtime

The existing Intelligence workspace calls `cassiusGateway.askIntelligence`, which POSTs a single question to `/api/cassius`. The Node.js route is marked server-only and reads credentials at request time. `lib/cassius/server.ts` sends an HTTPS request to the OpenAI Responses API; no SDK or package changes are required. The browser receives answer text and server-selected reference citations, never credentials. Commerce and account services remain independent.

## Environment

- `OPENAI_API_KEY`: required, server-only. Reuse the existing Vercel environment variable. Never prefix it with NEXT_PUBLIC_. Never commit it or paste it into source.
- `CASSIUS_OPENAI_MODEL`: optional; defaults to `gpt-4.1-mini`. The configured OpenAI project must have access to the selected Responses-compatible text model.
- `CASSIUS_MAX_OUTPUT_TOKENS`: optional integer 256–4096; defaults to 1200.
- `CASSIUS_ENABLED=false`: optional emergency off switch.

No new variable is required beyond the existing key. Environment changes take effect on a new Vercel deployment. For local live verification, supply the key through a private environment; automated tests use an explicitly fake fixture and intercepted HTTP responses, never billable calls. No provider fallback returns a fabricated answer.

## Existing brain and evidence

The handler reuses `answerKnowledge`, `buildKnowledgeContext`, the product corpus, and the grooming foundation. It preserves evidence states, unknowns, disputes, dated sources and the zero-approved-scientific-claims boundary. Context overflow asks for a narrower question without dropping safety passages. Hard safety gates return the existing evidence boundary directly without a model call. Other requests use OpenAI, including editorial and research-gap explanations. Citations are reference sources supplied to the model, not a claim that each generated sentence was independently verified. Generation can still make mistakes; no output becomes an approved advertising claim.

The interface remains a single-question workspace; no conversation history or private account records are sent. Questions are sent to OpenAI with `store:false`; this disables Responses storage, not all provider processing or retention. Questions and raw provider errors are not logged by this integration. Existing saved drafts are neither migrated nor deleted.

## Safeguards and limits

Same-origin JSON only; strict question-only schema; 10,000-character question and 45,000-byte streamed body caps; 5-second body-read cancellation; 25-second provider deadline; 35-second client deadline; 40-second Vercel function duration; bounded output; no automatic retries. Provider errors are mapped to sanitized messages and never returned verbatim. Responses use private/no-store caching. The UI blocks duplicate submissions and retains the question on errors.

Each warm server instance allows four concurrent requests, 10 requests per minute and 100 per hour per identity, and 500 requests per hour globally. Identity is hashed Vercel-injected `x-vercel-forwarded-for` on Vercel; other runtimes share one bucket and do not trust client identity headers. Invalid requests consume limits. These in-memory counters reset on cold starts and are not a distributed spending cap. Same-origin checks are browser protections, not authentication. The existing Vercel member authentication is not configured, so Cassius is a public, bounded endpoint. Before a high-traffic public launch, add a shared durable limiter or Vercel firewall limit and account-level OpenAI usage controls. No database or authentication provider was invented for this change.

## Verification

`npm test` includes HTTP-adapter/gateway integration, knowledge reuse, safety boundaries, malformed requests, missing configuration, provider errors/refusals, timeout, rate/concurrency checks and client/server import boundaries. The provider transport is intercepted in tests; a live success requires a key in the running environment. Also run `npm run typecheck`, `npm run lint:app`, `npm run lint`, and `npm run build`.

API contract: https://developers.openai.com/api/reference/typescript/resources/responses/methods/create
