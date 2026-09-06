# Groomed Gent Co. brand materials

The website palette below records the original source. The app now intentionally uses deeper purple and a more restrained interface as requested by the user; see [interface-refinement.md](interface-refinement.md) for the current direction.

Source: inline CSS on https://groomedgentco.com/, inspected September 5, 2026. The Four Pillars and Barber's Blend sections are the reference for gold card surfaces; their deep purple badges supply the purple material.

## Canonical palette

- Obsidian: #0A0A0A; raised black: #141118.
- Gold: #C4912F; highlight: #D9B66B; shaded gold: #7B5218.
- Purple: #1A0930 and #2A0F4A; purple type: #4A1A78; luminous accent: #6C3FC7.
- Exact gold gradient: 145deg, #6F4915 0%, #8A5E1B 16%, #A87522 32%, #C4912F 50%, #A77220 66%, #7B5218 82%, #4A300E 100%.

## App application

`app/brand-materials.css` owns canonical tokens and workspace material roles. It loads after component styles and the existing optical motion layer. Earlier experimental palette overrides were removed from `living-materials.css`.

Gold fills financial identity, product cases, and signature actions. Purple carries intelligence, tools, and inset reading surfaces. Obsidian anchors navigation and the surrounding canvas. Gold buttons use the brighter portion of the palette behind deep purple text for legibility. Financial details use dark purple inset reading surfaces over the full gold panel.

The existing motion pause control, reduced motion, visibility lifecycle, keyboard controls, and responsive layouts remain. Increased contrast / reduced transparency use solid purple panels; forced colors use system colors. No new animation loops, dependencies, routes, API calls, data claims, or infrastructure changes.

Charts use the canonical gold and royal-purple values. Creator Studio's default brand description contains exact hex values; saved user brand kits remain user-owned and are not overwritten.
