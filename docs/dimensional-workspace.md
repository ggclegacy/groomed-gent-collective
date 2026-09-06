# Dimensional workspace — September 6, 2026

## Research and implementation plan

1. Preserve the approved palette. Use obsidian for the environment and routine surfaces, deep imperial purple for localized depth, and metallic gold for financial identity and primary actions. This is a hierarchy of surface roles, not a rigid pixel percentage.
2. Create a short opening sequence without a splash screen, artificial loading delay, or initially hidden content. Surface entrances run once per mounted surface when visible.
3. Separate moving light from stationary content. Pointer and keyboard focus illuminate the material; text, charts, and touch targets remain stable. Signature gold surfaces receive a slow light pass; the atmosphere drifts without brightening the purple hue.
4. Keep Cassius as the optical focal point. Its existing analysis state accelerates the core; ambient motion never represents a backend connection or financial activity.
5. Reduce work: register only inserted element subtrees, batch mutation processing and pointer updates with animation frames, ignore text-only mutations, and reset reflection on blur, visibility change, preference changes, and pointer exit.
6. Verify empty and sample Home, workspace navigation, mobile overflow, console health, and motion pause. Run lint, existing tests, and the production build.

## Primary sources

- Apple HIG foundations: materials and motion form part of a coherent hierarchy. https://developer.apple.com/design/human-interface-guidelines/foundations
- Apple Liquid Glass: dimensional materials establish content/control relationships. https://developer.apple.com/videos/play/wwdc2025/219/
- web.dev: prefer transform and opacity; assess rendering costs rather than assuming all animation is cheap. https://web.dev/articles/animations-guide
- Carbon motion: productive motion supports work, while expressive motion belongs to meaningful moments. https://carbondesignsystem.com/elements/motion/overview/
- W3C reduced-motion technique: https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html

## Architecture

The existing `brand-materials.css` owns surface hierarchy and choreography; `LivingMaterials` owns lifecycle and interaction. No additional dependencies, rendering engine, image assets, app routes, or network requests. Reduced motion, increased contrast, reduced transparency, forced colors, the global pause preference, and hidden-tab/offscreen pause remain supported.

This pass improves the rendering workload and perceived responsiveness. It does not claim measured improvements to backend latency or a fixed frame rate.

## Validation

App lint, 107 existing tests, and production compilation/TypeScript passed. Desktop browser review confirmed 1440px content width without horizontal overflow, live material registration, pointer reflection coordinates, and no console errors. The global pause set atmosphere and core animations to paused and cleared the reflection transform. Mobile viewport setup completed, but an admin-policy verification failure interrupted further browser checks; a complete mobile visual pass is not claimed.
