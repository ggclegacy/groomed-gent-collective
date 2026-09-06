# Phase three — Life connected to Command and Voyage

## Implementation plan and result

1. Extend private memory with validated rituals, wardrobe details and trip preparation lists.
2. Make Life useful day to day: cadence, completion history, readiness and dress-code organization.
3. Connect those records to existing Command priorities, Cassius consent and Voyage preparation.
4. Exercise migration compatibility, private account round trips and production builds before handing off.

## Working flows

Create a grooming ritual in Life, then configure its start date, morning/evening/anytime preference, 1–365 day rhythm and 1–20 ordered steps. Record completion today or undo the latest entry. Command derives the next due date without marking the ritual permanently complete. Pause/resume preserves history. Cadence runs from the latest recorded completion, using the device's local calendar date; it is not a scheduled notification. The latest 90 distinct completion dates are retained.

Wardrobe records now have category, color, dress code and ready/laundry/repair status. The readiness summary counts active configured pieces. The preparation selector can filter by dress code; unavailable pieces cannot enter the handoff. Existing unstructured wardrobe notes remain readable and can be configured gradually.

Choose an open trip and review selected wardrobe pieces and grooming steps in Life before copying them to Voyage. The trip has its own editable preparation list with packed state and manual additions. Repeated copying preserves existing text and checked items without duplicates. Lists are limited to 100 items. These are explicit snapshots: editing or deleting the source Life record does not silently rewrite a trip. Remove copied details from the trip separately when desired. Grooming steps copied here are the member's recorded steps, not automatically approved instructions or a provider-generated protocol.

The existing Voyage itinerary, AI generation and grooming protocol remain intact. Saving a trip's general details preserves its current preparation list, including changes made while that editor was open. General Life editors preserve structured details; ritual configuration preserves current completion history.

Cassius receives bounded ritual, wardrobe and packing summaries only when the containing record is allowed in selected context. The preparation review button opens an editable Cassius prompt; it does not send immediately. Before copying, the UI explains that a shared trip's copied list may be included in Cassius context. Product Studio remains the source for approved product directions. No new product, health or live-weather claims are introduced.

## Data and privacy

Memory format **3** adds `ritual`, `wardrobe` and `packing` fields to the corresponding record types. The parser accepts versions 1, 2 and 3, preserves older notes, validates dates/enums/bounds/IDs, and canonicalizes to 3. Upgrading happens on read; only explicit saving writes it. Older application versions reject version 3 rather than silently discarding these new details. Export before rolling back to an older client; there is no automatic downgrade.

No database column migration is required: both D1 and PostgreSQL persist the validated private document. Existing owner isolation, revision checks, explicit-save flow, context consent and memory clearing remain in force. Deleting a source record does not erase explicitly copied snapshots; deleting a trip removes its list. Clearing all personal memory removes all working records and snapshots; saving commits the cleared copy.

## Flags, activation and deferred work

Life needs no new credentials or feature flag. Durable account saving still requires the existing configured member service; otherwise the app clearly identifies temporary drafts. Production Clerk/Neon activation and live provider verification remain outstanding. No cloud resources, paid services, migrations or deployment were activated.

Next highest-leverage sequence:

1. Activate the existing member adapter in the intended deployment and verify two real member sessions before release.
2. Add a controlled city-source retrieval layer with timestamps and provenance; current Voyage sources remain an official-link directory.
3. Add occasion-based outfit combinations, owned-product selection from approved Product Studio data, and per-trip grooming scheduling after those source contracts are ready.
4. Add calendar connections and opt-in reminders only with explicit scope and durable execution controls.

Live weather, outfit image recognition, automated product prescriptions, purchases, bookings and health inference are not part of this phase.

## Verification

- Full suite: 130 tests passed, including the SQLite account round trip for structured ritual data and existing PostgreSQL ownership checks.
- Typecheck and application lint passed.
- Production builds and HTTP checks are recorded below after completion. Sites and Next builds run sequentially because both write generated route types.
- No real member-provider session, visual browser QA or live AI generation is claimed by these local checks.
- Final Sites production build: passed (existing native-config and route-classification warnings remain).
- Final Next.js production build: passed, including type checking and route generation.
- Database schema check: four tables, no schema drift or new SQL migration.
- Production HTTP smoke: passed for OS navigation, Life readiness/preparation rendering, membership and session pages, and anonymous memory/planning denial.
