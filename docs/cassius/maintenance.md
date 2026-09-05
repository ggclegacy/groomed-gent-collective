# Maintenance and evidence intake

Keep the current evidence archive immutable. Add future captures under a new date. Record source ID, title, publisher/authority, original and resolved URL or document locator, capture time, document version, hash, access classification and reviewer. Preserve superseded sources. Failed fetches cannot support claims about page contents.

For each product use its stable internal ID and Shopify ID. Add a new formula revision when ingredients, serving, claims or directions change; retain the old revision in history. Never overwrite a historical formula silently. Manufacturer records must identify product, market, SKU, flavor, formula revision, effective date and label version. Link future research and training to those IDs; adding products does not change the model.

1. Place manufacturer files in the appropriate private evidence store; enter safe public metadata in the registry. Verify provenance and permission to publish.
2. Transcribe exact label names, units, quantities, serving basis, DV and footnotes. A second review must compare the transcription to the original label. Never infer a proprietary blend split or duplicate another flavor’s label.
3. Add or update field-level evidence. Keep website and manufacturer declarations separate until their identity/version match. Missing evidence remains null with a reason.
4. Open a conflict issue for competing values. Resolution requires a documented owner/reviewer decision naming source, effective date, chosen value and superseded observation; retain history. Source recency alone is not resolution.
5. Review intended claims individually for wording, audience, market, channel, substantiation, limitations, required disclaimer, approver and review/expiry dates. Empty approvedClaims is deliberate; schema/workflow must be extended with these review fields before any claims are activated. Website copy is never that approval.
6. Run the import-index builder, corpus validation/integrity tests and full application tests/typecheck/build. New items require identity and unknown-data regression tests. Update coverage and release notes.
7. Publish only after explicit deployment authorization. Local changes do not update an already hosted app.

Useful commands from the app directory: `node scripts/build-cassius-index.mjs`, `npm test`, `npm run typecheck`, `npm run lint:app`, `npm run build`. No ingestion script runs on startup or changes external systems.

Review priorities: prices/stock/offers before quoting; warnings, formulas and serving basis before a release; brand/program information whenever policy changes. The snapshot date is always displayed. For manufacturer imports add schema version and review records alongside the current fields; do not treat a later web crawl as automatic canonical promotion.
