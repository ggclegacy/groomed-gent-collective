# Cassius Creator Studio

## Architecture and integration

The authoritative app remains `/Users/neilstutes/Desktop/groomed-gent-collective`. `StudioWorkspace` now mounts the creative command center while retaining the original editor inside “Text drafts & publishing review.” Its account library, review flags, draft recovery and existing Cassius Intelligence routes are untouched.

- `components/creative-studio.tsx`: conversational direction, modes, upload controls, campaign orchestration, archive, brand profiles, caption/CTA and exports.
- `lib/creative/types.ts`: vendor-independent briefs, plans, provider capability contract, results and version records.
- `lib/creative/server.ts`: validates requests, applies knowledge safety boundaries, prepares structured creative direction through Cassius, then routes the image operation.
- `lib/creative/providers.ts`: working OpenAI Images adapter and capability-based routing. Providers receive only normalized prompts, image inputs, aspect ratios and cancellation signals. The browser does not choose the provider or model.
- `lib/creative/library.ts`: versioned IndexedDB store and deterministic original-image/logo composition for PNG export.
- `POST /api/creative/plan`: refines a brief without an image-generation call.
- `GET /api/creative`: minimal readiness and product identities from the Cassius corpus.
- `POST /api/creative`: one planned image plus paired caption/CTA per request.

Cassius consumes `buildKnowledgeContext` and `knowledgePolicy` from the existing authoritative corpus. Scientific claims remain unapproved; hard medical-safety gates stop before a model call. Brand profiles, uploaded references and conversations are untrusted input. Generated copy is an editorial draft requiring review, never an approved claim.

## Existing Vercel environment

Reuse `OPENAI_API_KEY`, server-only. No new secret is necessary for the OpenAI integration. The configured OpenAI project must have image-model access and billing; presence of a key is readiness, not a successful live-generation test. Never expose keys with `NEXT_PUBLIC_` or commit local environment files.

Optional variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CREATIVE_IMAGE_MODEL` | `gpt-image-2` | Server-selected Images API model; replacement must support selected flexible sizes, image edits and JPEG output. |
| `CASSIUS_OPENAI_MODEL` | `gpt-4.1-mini` | Existing Cassius text model setting, also used for structured creative plans. |
| `CREATIVE_ENABLED` | enabled | Set `false` to disable both creative endpoints. |
| `CREATIVE_HOURLY_IMAGES` | `24` | Conservative maximum creative attempts per hour per warm instance; 1–1000. Planning requests also count in their own handler. |

Environment changes require a Vercel redeployment. No key was read, copied, or embedded during implementation. The existing `.openai/hosting.json` is a legacy D1 declaration without a registered Sites project ID; this work preserves the requested Vercel runtime and does not create an unrelated Sites deployment.

## Image handling

OpenAI generation and edits use medium quality, one image per request, JPEG output at 85 compression, and flexible dimensions: 1024×1024, 1024×1280, 864×1536, 1536×864. Presets are Instagram 4:5, TikTok/Stories 9:16, ads 1:1, web 16:9. Outputs are still images, including TikTok; video is an extension point.

References are PNG/JPEG/WebP up to 1.3 MB and 4096 pixels per side in the browser. The server bounds encoded uploads and checks file signatures. Inpainting requires PNG input and a same-size alpha-channel PNG mask. Transparent mask pixels identify the edit region. Browser validation checks a transparent region; provider edits remain approximate and may alter nearby pixels.

Logo-safe handling never asks the model to regenerate the uploaded logo: original artwork is composited after generation. Product lockup similarly generates a backdrop and overlays the original transparent product PNG unchanged. Reference images for ordinary edits are sent to OpenAI; logos and locked product layers stay in the browser. Existing opaque product photographs need a prepared transparent cutout for clean lockups. Export uses an original layer composition at image resolution, not a screenshot. Generated product depictions without lockup are illustrative and require label/packaging review.

Campaign kits run three sequential jobs for Instagram, Stories and web using one brief and brand kit; later jobs also receive the first asset’s art direction. Completed jobs are saved immediately. A later failure preserves earlier assets and stops the queue. Directions are separately generated concepts; there is no promise of identical subjects across independent generations.

## Persistence and release limitations

The existing Vercel runtime explicitly has no configured authenticated member database. Creative assets, favorites, version ancestry, campaign IDs and brand profiles therefore persist in this browser’s IndexedDB, namespaced by available member ID or device. The UI labels this device storage. It is not cloud sync, access control, backup, or a multi-user asset service. Original text drafts retain their existing account/device behavior. Storage failures retain the image in memory and prompt download. PNG and JSON brief exports are available. Clearing browser data deletes device assets.

Cloud asset synchronization remains a follow-up requiring verified member identity and a durable database/object store. Do not trust client-supplied account IDs or Sites identity headers on the directly accessible Vercel runtime. Reuse the existing account-service authorization boundary when configuring cloud storage.

## Safety, rate and cost controls

Same-origin JSON; server-only credentials; strict allowed fields and enum validation; no client-selected endpoints/models; 3.9 MB streamed body cap with 5-second upload deadline; reference file signature checks; bounded planning tokens and image count; sanitized upstream errors; no prompts/keys/raw errors logged; private/no-store responses; 150-second generation deadline within a 180-second function budget; cancellation; duplicate-submit guard; max two simultaneous jobs, 12 attempts per identity/hour and 24 attempts per instance/hour by default. Identity uses only Vercel-injected IP on Vercel, otherwise one shared bucket.

These in-memory controls reset on cold starts and are not distributed financial limits or authentication. Before exposing at scale, configure shared durable rate/budget reservations or Vercel Firewall limits, verified member authorization and OpenAI account spending controls. Cost varies with prompts, references and image tokens; the UI discloses paid generation without inventing a price. Provider usage is stored with each successful result. A timeout/cancel may still incur provider charges. A lost response cannot be recovered from device history because no server job store exists.

Fallback routing only advances on an explicit pre-execution configuration failure (currently a 404). It never retries moderation failures, rate limits, network errors, timeouts, or ambiguous 5xx failures that could duplicate spend. Unconfigured adapters are excluded. No fake images or placeholder “success” are returned.

## Additional providers

Implement `CreativeProvider` in a dedicated module, declare supported operations and readiness, normalize output to the internal image format, map errors to `CreativeError`, and register it on the server. `futureProvider` descriptors for `imagen`, `flux`, `ideogram`, and `video` are deliberately unavailable; they are extension contracts, not live API integrations. Add live adapters only with verified API contracts and account configuration.

Keep new credentials server-only (for example Google service credentials, `BFL_API_KEY`, `IDEOGRAM_API_KEY`). Document actual credential requirements when implementing each adapter rather than adding unused secrets. Only route user references to explicitly configured providers. Test generation, editing capability exclusion, moderation, timeouts and fallback before enabling an adapter. Future async/video providers also need a durable job store, poll/webhook verification, asset storage and cost reservation; do not force those jobs into this synchronous image endpoint.

## Verification

Run `npm run typecheck`, `npm run lint:app`, application lint including `components/creative-studio.tsx`, `npm test`, and `npm run build`. Full `npm run lint` also runs against legacy UI primitives and hooks with known pre-existing errors; report these separately. Tests intercept HTTP and use fake credentials, covering image/plan contracts, evidence reuse, input safety, file validation, operation routing, fallback semantics, limiter reset/concurrency, error sanitation and deadlines. A real billable generation has not been verified without a runtime key.

Official API contract consulted September 5, 2026: https://developers.openai.com/api/docs/guides/image-generation and https://developers.openai.com/api/docs/models/gpt-image-2.

## Verified implementation snapshot

September 5, 2026: installed in the authoritative Desktop app with existing Cassius OpenAI, grooming and health work preserved. All 83 tests passed; typecheck passed; application lint including the new component passed; the standard `npm run build` (Turbopack) passed on the final code. Full repository lint still reports 20 pre-existing issues in shared UI primitives, `hooks/use-mobile.ts`, and `scripts/build-cassius-index.mjs`. No dependencies or secrets were added. A local HTTP preview returned 200. No Vercel deployment or real billable image generation was performed.
