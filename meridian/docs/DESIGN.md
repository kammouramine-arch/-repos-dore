# Design notes

## Principles

* **The plan, not the tool.** Screens answer "what matters now?", not "what data do we
  have?". Home shows at most three priorities before you ask for more.
* **Calm over dense.** Generous spacing, one accent colour, no dashboards.
* **Honest numbers.** Progress reflects the user's own goals and completions, computed
  in the database. No invented productivity score.
* **No shame.** Missing a day changes the plan, never the tone. Copy says "your plan was
  too ambitious", never "you failed".

## Tokens

`src/theme/tokens.ts` holds the whole system: two palettes exposing the same semantic
names, a type scale, spacing, radii, elevation and a muted per-life-area palette.
Components read semantic names (`colors.textSecondary`), never raw hex.

Dark mode is a first-class palette, not an inversion. `useTheme()` also exposes
`reduceMotion`, which switches animations off when the OS asks for it.

## The assistant's presence

A soft gradient orb that breathes when idle, quickens while thinking and widens while
listening. No robot, no face, no neon. It appears at the head of every assistant
message, in the tab bar, and at the top of the interview.

## Accessibility

* Every interactive element has a role, a label and a 44pt-ish touch target.
* Checkboxes report `accessibilityState.checked`; progress rings report their value.
* Text scales with system font size, capped at 1.6× so layouts hold together.
* Contrast targets AA for body text in both themes.
* Reduced motion disables the orb animation, skeleton shimmer and press scaling.

## Empty states

Every list has a written empty state with a next action: "Your day is clear.",
"Nothing here yet. Tell me what you want to accomplish.", "Want to build a routine?".
There is no "No data found" in the app — a test asserts it.
