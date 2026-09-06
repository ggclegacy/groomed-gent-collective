# Living materials — design research and implementation

## Research translated into design

Apple's [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) treats material, lighting, elevation, and interaction as one system. Its optical highlights provide separation; interaction temporarily energizes otherwise quiet controls. This informed brighter champagne crests, platinum reflections, dark neutral glass, and light concentrated at edges rather than brown fills. This is a CSS interpretation, not native Liquid Glass or physical refraction.

[web.dev's animation performance guide](https://web.dev/articles/animations-guide) recommends transform and opacity for smooth animation. Decorative ambience, surface reflections, button light passes, and orbit accents use those properties. Pointer input is throttled to one animation frame and changes only the active surface. The pre-existing Cassius core retains its own animation system.

[W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) informed an explicit ambient-motion control. The layer also honors reduced-motion, reduced-transparency, increased contrast, and forced-colors preferences. Decorative activity never indicates real-time financial activity or service connectivity.

## Architecture and scope

- `app/living-materials.css`: shared material and motion layer loaded last, covering Home, Product Studio, Creator Studio, Cassius, identity/membership, status, and navigation. No route or data changes.
- `components/living-materials.tsx`: root-mounted decorative atmosphere, persisted pause control, pointer reflections, and visibility lifecycle. Observers disconnect on unmount; detached surfaces are removed from the observed set. Hidden tabs and offscreen surfaces pause decorative animation. Storage-unavailable mode retains the preference for this page session.
- `components/dashboard/primitives.tsx`: Home reuses the existing compact Cassius core, including its deterministic optical geometry.
- `components/cassius-core.tsx`: pointer behavior respects the global pause control.
- `app/layout.tsx`: shared stylesheet and lifecycle component, without changing the server-rendered children boundary.

No dependencies, API configuration, production infrastructure, or commerce values changed. Gold uses pale champagne and near-white highlights, with cool platinum reflections to prevent a yellow-brown cast. Motion is decorative and account-independent.

## Validation

App lint and the existing 93 tests passed. Production build validation is recorded in the completion report. Browser inspection was attempted twice but blocked because the browser tool could not verify its admin-enforced access policy. This pass therefore does not claim verified mobile/desktop screenshots or interactive motion testing; those are the remaining verification step.
