# Product Studio learning experience

Built September 6, 2026 in the existing Groomed Gent Collective app. Entry: Product Studio (`/#knowledge`). This change does not deploy the app or provision a new identity provider.

## Implemented

- Product rooms retain all 19 catalog products. Thirteen have canonical Product Brain dossiers; six grooming records remain visible with explicit dossier-completion notices and existing Cassius retrieval. Planning-only concepts are not represented as sellable products.
- Overview, searchable ingredient details, serving-based Supplement Facts, directions/cautions, evidence, conflicts, and full source records. No new formula facts are created by this feature.
- 164 deterministic exercises derived from current canonical fields. Numeric recall preserves units and serving scope. Disputed facts never become settled recall answers. Missing blend amounts teach uncertainty.
- Daily missions combine recall, judgment, and customer discovery, followed by typed or optional browser-transcribed teach-back. A studied answer is guided practice. Role-aware Cassius coaching uses the existing server transport and current Product Brain retrieval.
- Bounded customer roleplay for six scenarios and three difficulty levels, three exchanges, early finish, qualitative coaching and retry. No AI scores or fictional certification. Speech input uses the browser vendor's optional speech service; text remains available. Read-aloud uses browser speech synthesis.
- Per-exercise source signatures, confidence-sensitive review timing, later-day recall mastery, five skill areas, weekly goals, review queue, and targeted source-change refreshers. Repeated early answers cannot inflate assessment credit. Review intervals are product heuristics to validate in a pilot, not a proven universal schedule.
- Customer reference view, two-product factual comparison, verified-marketing-only copy cards, explicit relationship disclosure, and Creator Studio handoff. The handoff carries a product ID; Creator Studio resolves the current record and preserves the normal unsaved-draft protection. No automatic publishing.
- Optional offline partner practice activity. There is no invented leaderboard or simulated team participation.

## Durable learning

`/api/account/learning` uses the existing member identity and D1 service. The new `product_learning` migration stores account-owned learning state with optimistic revision checks. The server grades submitted answers, ignores client scores, timestamps attempts, rejects stale exercise versions, handles repeated answer IDs idempotently, and isolates member records. Attempts retain the most recent 1,000 entries; mastery records persist independently. No customer messages, voice recordings, or simulation transcripts are stored in learning progress.

The existing Next.js/Vercel account adapter intentionally has no identity provider or database binding. Until those are connected, the feature clearly says **Practice preview** and keeps progress only in memory; it does not pretend to save to an account. D1-backed member deployments require the generated migration to be applied before activating this path. Suspended or anonymous users cannot access saved learning.

## Dependencies and remaining activation work

- Live Cassius requires the existing server-side OpenAI configuration. No key is embedded, and a failed or unavailable provider produces an explicit error. Responses are AI coaching grounded by retrieval and instructions, not guaranteed factual validation or human-reviewed training content.
- Canonical website observations remain awaiting founder/manufacturer review. Science and ingredient intelligence display only supplied evidence; no new scientific enrichment was invented. All current promotional cards remain gated until approved marketing language exists.
- Six grooming products still need complete canonical dossiers before formula assessments unlock. No catalog entry is silently dropped.
- Account identity/database activation on Vercel, team collaboration, commerce/referral instrumentation, and human-calibrated AI assessment are separate infrastructure/content work. The UI does not fabricate those capabilities.
- Existing browser-preview Creator drafts remain device-local per the existing app. The product brief does not silently overwrite a draft.

## Validation

Automated coverage includes all canonical products, undisclosed/disputed amounts, source-change invalidation, delayed recall, non-credit practice, confidence timing, account ownership and concurrency, idempotent saves, cross-origin and anonymous denial, marketing gates, current-revision Creator handoffs, and Cassius transport/provider failure. Run the full existing tests, type checks, app lint, and production build. Browser interaction testing and a human-scored ambassador pilot are still needed before production rollout.
