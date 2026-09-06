# Interface refinement — September 2026

## Research and decisions

- IBM Carbon dashboards: prioritize important data, reduce competing elements, assign consistent series colors, and use spacing to establish hierarchy. https://carbondesignsystem.com/data-visualization/dashboards/
- IBM Carbon motion: use subtle productive motion for daily work, reserve expressive motion for significant moments, and avoid bounce or purely decorative movement. https://carbondesignsystem.com/elements/motion/overview/
- Palantir Workshop: consistent application structure and visual hierarchy should guide the user's workflow. https://www.palantir.com/docs/foundry/workshop/application-design-best-practices
- Apple Liquid Glass: material should clarify the relationship between content and controls and recede to keep attention on the task. https://developer.apple.com/videos/play/wwdc2025/219/

These are principles, not claims that the app implements those proprietary systems.

## GGC implementation

The user approved existing gold materials but requested deeper purple and a more mature platform. The website's bright #6C3FC7 accent is therefore intentionally retired in the app. Purple surfaces now use #1A0930, #21112F, and #2A0F4A. Previously lavender interface text is neutralized for readability. Comparison charts use muted neutral #756D7C and dashed lines rather than dark purple against a dark plot.

Shared controls use a smaller consistent radius, quieter selection treatment, precise system typography, and reduced badge ornament. Metrics share a single reading surface instead of four nested cards. Product catalog identifiers are compact; decorative line icons and oversized monograms recede. Gold financial and membership surfaces remain.

Continuous button sweeps, ambient drift, ornamental orbit rings, and decorative core markers are removed from view. Cassius retains slow optical motion, with faster motion while the existing analysis state is active. Interactive feedback is short and steady. The existing global pause and reduced-motion controls remain.

Styles live in the existing brand-materials layer. Component CSS no longer retains bright violet/lavender literals. No API, data, authentication, publishing, or commerce behavior changes. Saved Creator Studio brand kits are not overwritten; the default guidance adopts the revised palette and editorial direction.
