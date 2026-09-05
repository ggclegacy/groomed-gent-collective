# Groomed Gent Collective — visual rebuild

Implemented locally on September 5, 2026. The user's detailed approved specification was the design authority; the parent image was not required or copied. No deployment, production infrastructure change, dependency change, domain-model change, or data migration was performed.

## Visual system

The environment is obsidian (#080B0A), with near-black forest (#172418 / #203420), gold anchored at #C4912F, warm reflected gold (#EFD49A), and restrained emerald (#70BB96). Shared material recipes define optical panels, metallic actions, inset fields, fine borders, inner highlights, shadows, and responsive radii. System sans-serif UI type is paired with an editorial display serif. Text is generally 16px, controls 14px, and secondary labels no smaller than 12px.

CASSIUS has a reusable nonhuman emerald core with gold orbital containment. Its decorative motion is independent of service availability, and the product explicitly labels the AI service offline. The interface contains no human photography or fabricated product/activity imagery. Identity uses a dimensional membership credential; status and access use a shared membership seal.

The prior stylesheet was replaced, not layered underneath a second theme. Existing shadcn controls are styled via shared tokens and data-slot selectors without editing vendored primitives. Profile validation, clipboard fallbacks, Studio persistence/recovery/export/review/undo, invitation rules, account isolation, and explicit disconnected states are preserved.

## Route and surface coverage

| Route / workspace | Implemented treatment |
| --- | --- |
| `/`, `/#home` | New residence composition, CASSIUS core, optical metrics, compact destination tiles, explicit demo state |
| `/#identity` | Profile editor glass, separate credential and referral surfaces, copy/save feedback |
| `/#performance` | Two-column ledger tiles, disconnected notice, truthful transaction empty state |
| `/#intelligence` | CASSIUS presence beside a separate question console on desktop; dedicated mobile composition; prompts, local-save states, Studio brief preserved |
| `/#knowledge` | Material field-guide selectors and reading panel; responsive guide layout; pending-catalog notice |
| `/#studio` | Separate library and writing materials, inset editor, selection controls, review checklist, save/export/copy/handoff controls, feedback and replacement dialog |
| `/#status` | Membership seal, status glass, gold readiness progress, incomplete/readiness states |
| `/membership` | Invitation entrance, loading/retry, unconfigured/signed-out/redeem/active/paused states, membership credential |
| Founder desk inside `/membership` | Invitation form, issued-code panel, member/invitation ledgers, action controls |
| `/members/studio` | Member heading/session, account Studio, library loading and access gating |
| Loading / error / missing page | New shared loading surface, recoverable route error, custom 404 entrance |
| Shared chrome | Floating desktop navigation rail, mobile quick dock, full mobile menu, focus states, skip link, footer, popovers and dialogs |

No community route, product catalog, rewards backend, or other new product capability was invented. Those are not implemented in the existing app. `/api/account/*` remains unchanged.

## Responsive and accessibility work

Phone rules (up to 767px) provide a safe-area-aware fixed quick dock, full menu access, compact horizontal destination cards, two-column metrics, single-column editors and account forms, full-width primary actions where appropriate, and content clearance under the dock. Tablet rules (768–1000px) reduce the navigation rail and rearrange workspaces rather than compressing desktop columns. Intermediate widths also collapse the Studio library. Desktop uses separate presence/console, guide/reader, identity, and writing/library compositions, with capped content width.

Source review considered 360/390px phone, 768/834px tablet, and 1440px desktop widths. This is not a claim of browser geometry verification. Focus is moved to the main content and scroll reset when switching workspaces. Reduced-motion users receive no core animation; forced-colors and reduced-transparency fallbacks are present.

Token contrast calculations against the brightest designated forest background: body 11.76:1, muted text 6.29:1, warm gold labels 9.25:1. Dark button text against the darkest gold stop is 6.54:1. Placeholder/input contrast is 6.65:1. These calculations are not a full rendered accessibility audit.

## Verification

- Typecheck: passed after final application changes.
- Lint of all changed application files, including the new materials and route states: passed.
- Existing test suite: 19/19 passed, covering invitations, account isolation, referral truthfulness, profile validation, Studio persistence, review invalidation, and exports.
- Production build: passed after final application changes.
- Local HTTP checks: `/`, `/membership`, `/members/studio` return HTML with HTTP 200; unknown route returns HTTP 404.
- Full repository lint: retains the 19 previously documented findings in untouched scaffold primitives and `hooks/use-mobile.ts`. A new loading-surface lint finding was fixed by using semantic `output`.
- Existing Vite JSON-import, optimization, and route-classification warnings remain. The development session also logged React multiple-renderer/context warnings after hot reloads; HTTP responses still succeeded, but browser runtime behavior could not be inspected.
- Browser/screenshot checks: blocked on two attempts. The browser tool could not verify the admin-enforced policy and denied access to localhost. No alternate browser or indirect bypass was used. Actual phone/tablet/desktop screenshots, interactive browser regression checks, and final visual approval remain unverified.

## Changed source files

- `app/globals.css`
- `components/materials.tsx` (new)
- `components/collective.tsx`
- `components/workspaces.tsx`
- `components/studio-workspace.tsx`
- `components/member-access.tsx`
- `app/loading.tsx` (new)
- `app/error.tsx` (new)
- `app/not-found.tsx` (new)

The repository was already entirely untracked when inspected. No commit or reset was made.

## Strongest next refinement

Complete a browser-led visual and interaction pass at phone, tablet, desktop, 200% text enlargement, and reduced motion once browser policy access works. Prioritize the CASSIUS material balance, tablet navigation density, long editorial text and Studio workflows, invitation/member states, and focus/scroll behavior. Then fine-tune perceived depth and motion from real screenshots. Product integrations remain a separate phase requiring approved sources and explicit infrastructure authorization.

## Color balance refinement

Following user review, obsidian and masculine gold now dominate. Environment and panel bases are neutral black (#080808 / #121212); text is warm-neutral rather than green-tinted. Navigation, fields, member credentials, seals, popovers, and feedback surfaces use smoked black and gold. Emerald remains localized to the darker CASSIUS core, subtle nearby illumination, small indicators and focus states. The earlier forest-heavy palette description above records the first iteration and is superseded by this refinement. Layout and product behavior are unchanged.

### Final material-balance pass

A further user review requested more depth. Neutral obsidian remains the base, with forest reflections returned selectively to destination tiles, status, credentials, navigation depth and the CASSIUS environment. Gold now has stronger machined rims, light-catching icon housings, dimensional button highlights and richer orbital containment. Shared `--glass-signature` and `--gold-rim` recipes keep these accents consistent; reading text remains warm-neutral. Layout and functionality are unchanged.

### CASSIUS identity refinement

Replaced the original orb with an isolated client visualization: a pulsing optical nucleus, independently moving emerald layers, fine signal filaments, three gold containment rings with traveling nodes, calibration marks, specular shell and ground reflection. Pointer-driven parallax is restrained and only applies to mouse input. Animation pauses outside the viewport and when the document is hidden; reduced motion disables animation and parallax. Observers, listeners and animation-frame requests are cleaned up on unmount. The offline service disclosure remains unchanged. No other product surfaces were redesigned in this pass.
