# Phase four — private capture to reviewed action

## Built

Logbook has a quick text inbox: a private observation becomes a note with a title derived from its first line. The raw text remains editable. No provider request, inferred date, inferred person or automatic account save occurs.

Each open note can be reviewed into a Desk task/meeting or decision, a new Circle person, or a Vault text reference. The user chooses the destination, title, retained text, optional date and optional existing-person link. Promotion creates a separate private record and marks the source processed in one validated memory update. Stale reviews, missing people, duplicate processing and capacity violations are rejected before mutation. The new record never inherits source consent. Reopening a processed note deliberately permits another review.

Desk now groups open tasks and decisions into needs-attention, today, ahead and unscheduled views. Dates use the device's local calendar day. Each group shows up to five items, with remaining records below. Items can be completed directly or discussed through an editable Cassius prompt. Related tasks already participate in Circle meeting briefs; dated items participate in Command priorities.

## Architecture and privacy

This phase reuses memory format 3 and existing note, task, decision, person and reference contracts. No SQL migration, new credential or cloud service is required. The existing account revision check, member isolation and explicit-save flow persist.

A reviewed record is a separate copy. Deleting its source note does not delete it; the review explains this before creation. Clear-all memory still removes both when saved. Marking processed does not revoke an existing source note's Cassius consent; that remains a separate user control. A new record starts excluded from context.

No outbound messages, reminders, calendar writes, microphone capture or AI extraction happen. “Discuss with Cassius” opens a prompt for review and deliberate submission. Voice transcription, structured AI extraction and provenance links are deferred. Vault remains a text reference library; binary document upload/search remains deferred.

## Next sequence

1. Activate and verify the existing production member account adapter with real sessions.
2. Add controlled current city-source retrieval and provenance to Voyage.
3. Add explicit-consent transcription and authenticated structured extraction using these same review contracts.
4. Add document storage with ownership checks, retention controls and indexed retrieval.

Production activation and deployment were not performed in this phase. The authoritative source remains `gentleman-os-work/app`.

## Verification — September 6, 2026

- 134 tests passed; capture edge cases rerun after the initial empty-date Desk fix: 4 passed.
- Application lint and typecheck passed.
- Sites and Next.js production builds passed sequentially. Existing Sites configuration/route-classification warnings remain.
- Production HTTP smoke passed at localhost:4174: Logbook, Desk and Life panels render; navigation and membership pages respond; anonymous private memory and trip planning remain blocked.
- No visual browser interaction test, live identity-provider session, remote deployment or live AI generation was performed.
