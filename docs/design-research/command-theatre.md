# Bronze gold and the Command theatre

## Research and decision

RAL identifies 1036 as Pearl Gold: https://www.ral-farben.de/en/colour/ral-classic/ral-1036/9111 . This inspired the material family, not a claimed digital match. The exact screen palette is our design decision: #A58B64 signature, #BCA17A highlight, #68523A metal shadow. Reduced saturation addresses the yellow cast; no white stops are added to gold. No universally perfect or masculine hex can be established from research.

Apple describes motion as a way to convey feedback and enrich experience: https://developer.apple.com/design/human-interface-guidelines/motion . Web.dev recommends prioritizing transform and opacity and measuring other animation costs: https://web.dev/articles/animations-guide . Our background light textures and sphere gradients stay static while their layers rotate/translate/fade. No animated blur, layout properties, canvas engine or new dependency.

## Implementation

Command has an obsidian stage, moving purple/bronze light fields, elliptical orbit lines, four decorative stars, a glowing purple sphere with rotating surface light, and a dark stable greeting area. Cassius remains a working invocation of the existing assistant, not a false live-status display. Uses the existing IntersectionObserver and motion preference system. Pause, hidden-tab, offscreen, reduced-motion and forced-color rules cover all new layers. Mobile layout stacks the sphere below the greeting.

The unrelated pending Cassius/workspace edits were preserved and excluded from this release. No personal-data or account behavior changes.

## Verification

Solid-token contrast (not rendered certification):
- signature gold on purple: 5.12:1
- button darkest stop: 5.33:1
