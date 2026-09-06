# Rounded spatial cockpit — September 2026

The approved obsidian, deep purple and bronze-gold palette stays unchanged. The design moves from mechanical angular frames to rounded optical glass, orbital geometry and useful information depth.

## Research and interpretation

- [Apple spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout/): depth helps communicate hierarchy. Apply restrained layered surfaces and reflections to separate primary actions from ambient decoration.
- [NASA cockpit display research](https://www.nasa.gov/human-systems-integration-division/cockpit-display-design-intelligent-spacecraft-interface-systems/): organize complex information and manage clutter. Command receives linked, actual priority, ritual and trip information instead of decorative telemetry. This is design inspiration, not flight-system compliance.
- [Web.dev animation guidance](https://web.dev/articles/animations-guide): prefer transform and opacity for motion. The new reticle rotates using CSS transforms; the perspective grid is static. No new rendering dependencies or WebGL loop.

## Implementation

Restored rounded card and control radii throughout the existing workspaces. Added a final spatial cockpit style layer, circular Cassius reticle, orbital module illustrations and responsive daily overview. Existing lighting and pointer response remain. Motion respects reduced-motion and existing visibility/pause controls; high-contrast fallbacks remain available. Illustrations are decorative and hidden from assistive technology. Overview entries are real navigation links with values derived from existing member memory.

No schema, provider configuration or feature flag changes. No invented readiness, connection or system-health metrics. Performance profiling and user testing remain necessary before making comparative performance or usability claims.
