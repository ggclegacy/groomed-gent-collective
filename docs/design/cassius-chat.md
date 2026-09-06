# Cassius conversation workspace

September 6, 2026

## Research and decisions

The supplied mobile screenshots put a large promotional card, explanatory text, and five questions ahead of the input. This adds scrolling to every visit. The replacement treats Cassius as a daily conversation workspace.

- [Nielsen Norman Group: Prompt Controls in GenAI Chatbots](https://www.nngroup.com/articles/prompt-controls-genai/) explains how supplementary controls support input and recommends grouping controls with clear labels. Applied here: Ideas lives inside the composer; three optional starters insert editable text without sending it.
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) distinguishes the visible viewport from the layout viewport, including changes caused by an on-screen keyboard. Applied here: size the workspace to available visible height, give the conversation its own scroll region, and hide the mobile dock while the keyboard reduces that space. Physical iOS keyboard behavior still needs device verification.
- [W3C: prefers-reduced-motion](https://www.w3.org/WAI/WCAG21/Techniques/css/C39) documents respecting motion preferences. Applied here: retain the existing reduced-motion and ambient-pause support. The orb uses slow ambient motion and changes its brightness and orbit speed with actual interface state; it does not imply microphone access or service connectivity.

Visual direction is a design judgment based on the existing brand: near-black and forest surfaces, restrained champagne gold, editorial serif typography, and the existing mechanical orb. The prominent green panel and redundant floating Cassius launcher are removed from this section.

## Interaction

A visible compact composer expands up to 112px. Desktop Enter sends; Shift+Enter adds a line; mobile Enter remains a newline. IME composition does not submit. Pending submissions cannot duplicate or replace the submitted question. Failed requests preserve the draft. Existing history limits, source disclosure, and the real API gateway remain intact. The conversation is ephemeral, with that behavior explained in the expandable chat note.

The orb has idle, attentive, thinking, answered, and error states. During conversation it becomes a small presence above the transcript. Replies do not force scrolling when someone is reading older content.

## Scope and limits

Changes are in components/workspaces.tsx, components/cassius-core.tsx, app/globals.css and the existing UI regression assertions. No backend model, credentials, storage, or deployment configuration was changed. The local API reports that Cassius is not connected; live AI responses cannot be verified without its runtime configuration. The browser also exposed a pre-existing ambient material attribute hydration warning on the home route.

## Verification evidence

- Type generation and TypeScript checking passed.
- App lint and git diff whitespace checks passed.
- All 37 existing Cassius tests passed, including request history, errors, configuration boundaries, and evidence behavior. Updated two source assertions for the renamed New chat action and captured submission variable.
- Browser checked at 390×844, 375×667 and 1440×900. Composer remained visible with no horizontal overflow.
- Ideas expands, inserts an editable prompt, and returns focus to the input. Submission displays the thinking state and disables duplicate sends. The local 503 configuration response preserves the prompt and shows a visible error.
- Verified ambient pause switches the orb's computed animation playback state to paused; restored motion afterward.
- Used the available in-app browser because agent-browser CLI was absent. The native phone keyboard and live provider response remain unverified in this environment.
- Production build passed with `npm run build -- --webpack`, including TypeScript, static generation, and build traces. Default Turbopack stalled during compilation and was stopped before this successful fallback.
