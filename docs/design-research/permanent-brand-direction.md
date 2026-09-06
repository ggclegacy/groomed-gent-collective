# Permanent brand: obsidian, amethyst, gold

Research completed before implementation. Apple explains layered lighting, reflections and responsive motion as depth cues: https://developer.apple.com/videos/play/wwdc2025/219/

WCAG requires 4.5:1 for ordinary text and 3:1 for large text: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

Nonessential interaction animation should be disableable: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html

Design recommendation: approximately 60% obsidian environment, 30% purple content planes, 10% gold emphasis. This is a design hypothesis, not a research-proven optimum or measured pixel ratio. It supersedes the green and 40/40/20 experiments.

Obsidian #080809 owns the canvas and navigation. Purple surfaces range from #1a1024 to #402650 with gold upper bevels and dark lower shadows. Gold #c9a45c and #e7ce94 identify actions, headings, icons, focus and borders. Body copy remains warm ivory and secondary copy muted lavender. All Command destination cards are purple. Large metallic-gold content planes are removed. Chart comparisons use lavender.

Preserve card tilt, reflection motion, instrument perspective and layered shadows. Preserve existing motion pause, reduced-motion and forced-color behavior. No new dependencies or animation loops. These are web material effects, not Apple's native optical renderer.

Solid-token contrast (not rendered certification):
- gold on raised purple: 5.55:1
- body on raised purple: 10.85:1
- secondary on raised purple: 6.62:1
- button darkest stop: 5.67:1
