# DoOnce — Brand

**One sentence:** DoOnce lets the physical world remember what people taught you.

**Category:** Personal procedural memory. Photos keep what something looked like. Voice notes keep what someone said. DoOnce keeps *how something is done*.

**Equation:** SEE → REMEMBER → DO.

## The mark: "The Loop"

A single stroke. It enters from the left as a short gesture (the *once*), travels one full time around (the *action*), and stops just short of where it began. The open gap is deliberate: the action was done once, and the shape it leaves behind is the memory.

Why it works:

- **One continuous stroke.** No letter, no brain, no sparkle, no chat bubble. It is a path, which is what a procedure is.
- **Strong silhouette.** Reads as a ring with a tail at 20 px, in a monochrome glyph, and as a tab-bar symbol. It does not need the wordmark.
- **Animates as its own story.** The stroke draws on (action), the loop snaps closed (capture), an echo appears in the gap (memory). See `logo-animated.svg`.
- **Distinct from neighbours.** The tail is tangential and enters from the left, so it does not read as a magnifier (tail from bottom-right), refresh (arrowhead) or power (vertical bar).

Geometry (100 × 100 viewBox): ring centre (56, 46) radius 26, stroke 12, round caps. Entry at 135°, sweep 290° counter-clockwise, terminus at 205°. Tail: `M 21 51.5 C 27 53.5, 32.5 58.5, 37.6 64.4`.

Files:

| File | Use |
|---|---|
| `logo.svg` | Primary mark, ink on any light surface |
| `logo-mono.svg` | `currentColor` glyph for UI (tab bar, pull-to-refresh, empty states) |
| `app-icon.svg` | 1024 App Store icon, signal on warm near-black, with echo |
| `logo-animated.svg` | Reference implementation of the launch animation (CSS in SVG) |

Clear space: 0.5 × ring diameter on every side. Minimum size: 16 px.

## Wordmark

Set "DoOnce" in the system font, weight 700, tracking −0.02em, with the mark to the left at cap height. Never stack the mark inside a rounded square in-product; the app icon is the only container.

## Signal colour

One colour means "DoOnce knows this": recognition contour, active capture ring, step confirmation, remembered-object badge, active guidance, success.

| Mode | Signal | Text-safe signal |
|---|---|---|
| Light | `#8BD400` | `#3F7D00` (≥ 4.5:1 on porcelain) |
| Dark | `#CFF25A` | `#CFF25A` (≥ 12:1 on near-black) |

It is a lucid mineral chartreuse: bright enough to read as "lit", green enough to mean "yes", and unlike the blue/purple of every AI product. It appears sparingly. If a screen has signal colour on more than one element that is not a state, it is over-used.

Neutrals are warm: porcelain `#F7F7F4` and ink `#111210` in light; near-black `#090A09` and bone `#F2F2EE` in dark. Never pure white or pure black as a page.

## Voice

Calm, observant, reliable, warm, precise. Short sentences. It says *Remembered.* not *AI analysis completed successfully!* It says *Julien said…* not *The correct way is…* It never says "AI" when it can show the result instead.
