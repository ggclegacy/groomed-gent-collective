# Obsidian / aged gold / forest green

The final direction is a private club with a technical working interface: quiet obsidian reading surfaces, green optical depth and selected states, and aged gold for primary actions and premium emphasis. Color associations are a design judgment for this brief, not a universal definition of masculinity.

## Research and palette decision

- [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): use 4.5:1 for ordinary text, including placeholders; assess the actual rendered background. The implementation uses a lighter foreground instead of making deep green itself into small text.
- [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): essential control boundaries, focus, and chart marks need 3:1 against adjacent colors. Quiet decorative panel edges are distinct from control borders.
- [Carbon color overview](https://carbondesignsystem.com/elements/color/overview/): semantic roles and progressively lighter dark surfaces provide a useful technical foundation. This app uses its own palette, not Carbon's default colors.
- [Rolex Deepsea visual reference](https://media.rolex.com/rolexcom/new-watches/2024/media/user-guides/rolex-deepsea/rolex_deepsea_en-us.pdf): a restrained dark green field with gold identity offers a relevant luxury precedent. These are not sampled Rolex colors.

Both gold candidates were calculated against the app's surfaces and reviewed in context. `#B8892E` is the final authority metal: less bright and less saturated in appearance than `#C4912F`, with 6.35:1 on obsidian and 4.84:1 on the primary green. The brighter candidate is not retained. Neither candidate should be used as small text on the lighter green surface; `#D2B477` provides 6.02:1 there. Keep filled primary-button labels obsidian, including hover and pressed states.

| Role | Hex |
|---|---|
| Obsidian environment | `#080808` |
| Inset / base / raised surface | `#0B0F0D` / `#111413` / `#1A211E` |
| Aged gold / highlight / pressed | `#B8892E` / `#D2B477` / `#AA7D29` |
| Deep green / deep shadow / raised green | `#102A22` / `#0B1B16` / `#183D31` |
| Green edge / readable positive accent | `#527F6C` / `#90B5A2` |
| Primary / muted / secondary text | `#F2F0EB` / `#B8BDB8` / `#9CA79F` |
| Quiet border / control border | `#303D36` / `#68796F` |
| Success / warning / error / info | `#90B5A2` / `#D2B477` / `#E7A09A` / `#9DB8CB` |

## Token architecture

`lib/brand.json` holds the primitive colors shared by CSS, Clerk appearance, manifest metadata, and creative-generation prompts. `scripts/brand-tokens.mjs` generates `app/brand-tokens.css`. `app/brand-materials.css` maps these into semantic environment, surface, text, action, control, selection, focus, status, chart, glass, gradient, glow, and shadow roles and the existing Tailwind/shadcn aliases. Component styles refer to those variables; no literal stylesheet colors remain outside the generated palette.

`npm run brand:check` verifies generated tokens, 78 intended foreground/background combinations, and the absence of legacy palette references or unmanaged stylesheet colors. It runs before production builds. Opacity, gradients, raster product imagery, and composited surfaces still require visual inspection; passing token checks is not a claim of full WCAG certification.

## Screen treatment

- Command: forest-green optical core and atmospheric lighting, neutral headline and reading panels, gold primary action, green selected navigation with a visible edge.
- Cassius: green internal energy inside a brushed gold instrument; clear input boundary and readable disabled controls.
- Personal workspaces: consistent form beds, neutral field labels, forest-green depth, readable controls, green positive indicators.
- Product and Creator studios: quieter content surfaces, selected green controls, shared premium gold, and updated default creative briefs.
- Voyage: green world atmosphere, neutral place titles, legible status indicator, themed preferences/detail surfaces; map has a named region role.
- Charts: gold current series, lighter green dashed comparison, supporting blue/rose series, readable axes, tooltip surface, and the existing exact-value table.
- Account and system states: shared dark surface and form tokens; loading, empty, unavailable and error paths retain their existing behavior.
- Reduced motion, reduced transparency, increased contrast and forced-color adaptations are preserved. Decorative surface annotations wait until the active client route hydrates.

## Scope and delivery

This work continues the latest `gentleman-publish` checkout at Git base `882f6d6`, including unfinished theme consolidation inherited from the earlier task. The original inherited diff is preserved separately in the local review evidence. Synced project references under `sources/` are untouched. No credentials, data schemas, account permissions, live integrations, or deployment audience were changed.

Validation results and remaining environment limitations are recorded in `validation.md`; machine-readable contrast and browser evidence accompany this report locally.
