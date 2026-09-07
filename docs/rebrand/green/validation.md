# Validation and delivery

Validated September 7, 2026 against a local production build.

- Production build and TypeScript: passed (`npm run build -- --webpack`).
- Application lint: passed (`npm run lint:app`).
- Existing tests: 195 passed, zero failures (`npm test`). This includes pre-existing local commerce tests, which were not changed or included in this rebrand.
- Token guard: 78 text, action, control and chart contrast pairs passed; generated tokens are synchronized, and no legacy palette references or literal stylesheet colors remain in the scanned scope.
- HTTP smoke: navigation, account/setup paths and private-memory/planning access gates passed.
- Browser audit: 48 views at 390 × 844 and 1440 × 1000; zero automated axe WCAG A/AA violations and no document-level horizontal overflow. Covered all 15 workspace sections and nine standalone account/member/Voyage routes.
- Interaction checks: draft creation/completion, mobile navigation and note capture, Cassius dialog focus/Escape, motion toggle, chart metric selection/exact-value table, tablet reflow, and forced colors passed with no JavaScript page errors.
- Manual visual review covered the major desktop and phone surfaces. It caught account-button label contrast and a 320px Product Studio selector overflow that the main automated audit missed; both were corrected and targeted checks were run afterward.

## Evidence

`contrast.json` records exact token ratios and candidate gold comparisons. `browser-audit.json` records the full route audit, `interactions.json` records exercised flows, and `final-checks.json` / `small-screen.json` record the final targeted checks. Local screenshots are in `screenshots/` and intentionally excluded from Git. `changed-files.json` distinguishes changes made during this continuation from inherited theme work.

## Limits and remaining issues

No known rebrand regression remains in the exercised paths. Automated contrast analysis cannot resolve every gradient, transparent layer or decorative image; the audit includes incomplete checks, supplemented by token calculations and visual inspection. This is WCAG-conscious validation, not certification.

Clerk credentials, live member persistence, map services and AI services are not configured in this local environment. Their setup/unavailable/demo states were tested, with expected 503 responses where applicable; authenticated third-party screens and live service operations require a configured environment. Existing raster PWA artwork was retained; the vector favicon and browser/PWA theme colors use the new palette.

Changes are local on `rebrand/obsidian-aged-gold-green`. No production deployment or Git push was performed. Pre-existing commerce files remain untouched and outside the rebrand commit.
