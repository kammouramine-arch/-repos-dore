# DoOnce — Motion specification

Motion tells the user where something came from, where it went, what changed, what DoOnce recognised, and whether it worked. If an animation does none of those, it is removed.

Durations and curves are tokens (`tokens.json → motion`). Every spatial animation has a Reduce Motion equivalent: a crossfade of 200 ms, no overshoot, no parallax.

| Budget | Duration | Used for |
|---|---|---|
| instant | 120 ms | press state, toggles |
| quick | 180 ms | chips, badges, list rows |
| standard | 260 ms | sheet content, menus |
| navigation | 380 ms | push, matched-geometry expand |
| hero | 620 ms | save-to-object, recognition, procedure start |
| launch | 520 / 1100 ms | normal / first launch |

Springs: **snappy** (0.32 / 0.86) for presses and chips; **gentle** (0.50 / 0.88) for navigation and sheets; **lively** (0.42 / 0.72) only for the bloom and the recognition pulse, never for text.

Everything is interruptible. A gesture in progress cancels the running animation and retargets from the current value.

## Key animations

### 1. Logo formation (launch)
- Trigger: cold launch. Full (1100 ms) on first launch and roughly one cold launch in five; short (520 ms) otherwise. Tapping anywhere skips to the final frame.
- 0–780 ms: stroke draws along its path, ease `standard`. The stroke is signal on near-black in the launch screen.
- 780 ms: loop closes. Scale 1.00 → 1.035 → 1.00 over 240 ms with `lively`. **Haptic: rigid.** Optional sound: quiet crystalline tick.
- 820–1100 ms: echo arc fades to 32 % in the gap. Background lifts from `backgroundSunken` to `backgroundPrimary` (the world comes alive).
- Exit: mark scales to 0.6 and moves to the Memory title position while the first screen fades in underneath (280 ms `gentle`). Never a white flash: the launch storyboard is already `backgroundPrimary` in the active appearance.
- Reduce Motion: static mark fades in 200 ms, holds 300 ms, crossfades to the app.

### 2. Onboarding transitions
- Horizontal paged scroll; the headline of the next scene is pre-laid and moves at 0.9× scroll speed, the photograph at 1.1× (subtle parallax, ±12 pt max).
- Scene 2 live-intelligence chips appear staggered 90 ms apart, each: opacity 0→1, y +8→0, 220 ms `standard`. Highlighted transcript words tint to signal over 180 ms.
- Scene 3 recognition uses the real recognition animation (below) at 0.8× scale.
- Reduce Motion: crossfades, no parallax, chips appear together.

### 3. Centre action bloom
- Trigger: tap centre control. **Haptic: light** on open.
- The control's ring expands into a 3-item radial/vertical cluster: each item scales 0.6→1 with `lively`, staggered 40 ms, blurred 8→0 px, from the control's centre (matched geometry).
- Background gets `glassOnMedia` scrim over 200 ms; the tab bar labels fade to 0.
- Selecting an item: **Haptic: selection**, the chosen item scales to 1.06 for 120 ms and morphs into the camera surface (the item's circle expands to fill the screen, 380 ms `gentle`, content crossfades at 60 %).
- Dismiss: tap outside or drag down; items retract with `snappy`, 200 ms.
- Reduce Motion: items fade in together, camera crossfades.

### 4. Camera launch
- Preview begins under a `backgroundSunken` layer that fades out as the first frame arrives (max 260 ms after session start). Controls fade in 60 ms later. Never a spinner. If permission is missing, the education card slides up from the bottom instead.

### 5. Recognition (the Shazam moment)
Total 500–750 ms. Calm, no scanner lines, no boxes.
1. 0–200 ms: 6–10 faint anchor points (2 pt, `textOnInverse` at 40 %) fade in near stable feature points and drift ≤ 3 pt to settle.
2. 200–420 ms: a soft contour (2 pt stroke, signal, 28 px blur halo at 20 %) resolves around the object hull; anchors fade out.
3. 420 ms: signal pulse. Contour opacity 1 → 0.6 → 1 over 180 ms; halo scale 1 → 1.06 → 1. **Haptic: medium.** Optional sound: soft lock-in.
4. 460–640 ms: object label rises from 8 pt below its anchor point, 220 ms `standard`; memory count follows 80 ms later.
5. 640 ms: bottom material expands from a 12 pt pill to the object sheet, `gentle` 380 ms.
- Uncertain (medium confidence): steps 1–2 only, contour at 50 % without pulse; label reads *Is this your espresso machine?* with Yes / No chips.
- Unknown: after 2.5 s of steps 1–2 failing to resolve, anchors fade and a calm card slides in: *I don't know this yet.*
- Reduce Motion: contour and label fade in together at 420 ms; haptic unchanged.

### 6. Record start / stop
- Start: button compresses to 0.92 (120 ms), **Haptic: medium**; the outer ring rotates 90° and morphs from a circle into a rounded square (stop glyph) over 320 ms `gentle`; a 1 pt signal ring outside the button breathes with audio amplitude (scale 1.00–1.04, mapped to RMS, 60 fps, capped). Elapsed time counts up in monospaced digits and fades in at 200 ms.
- Stop: button releases to 1.0 with `snappy`, **Haptic: light**; preview freezes on the last frame and that frame scales to 0.92, gains radius `large`, and becomes the hero of the Processing screen (matched geometry, 380 ms).
- Marked moment: tap "Remember this" → a signal tick mark drops onto the timeline ribbon, **Haptic: selection**; chip scales 1→1.08→1.

### 7. Processing (video → memory)
- The frozen last frame sits at the top. A horizontal timeline ribbon draws under it (its width tied to real duration).
- As each real pipeline stage completes (transcript, moments, steps), items appear: transcript words stream in at word-cadence; detected moments drop tick marks; then frames lift out of the ribbon and arrange into a vertical sequence, each frame 240 ms `gentle` with 60 ms stagger.
- The status line only ever shows a stage that is actually running: *Listening…*, *Finding steps…*, *Matching object…*, *Creating visual guide…*. No percentages unless the backend reports them.

### 8. Memory save (Remember)
- Tap Remember: **Haptic: light** on press.
- The procedure card compresses (scale 1 → 0.86, blur 0 → 6 px) and moves toward the object thumbnail position (620 ms `emphasized`); the object thumbnail scales 0.9→1 at 60 % and its memory count increments with a 1-digit roll. Then the procedure settles under the object as a row (240 ms).
- **Haptic: success** at settle. Text: *Remembered.* then *Next time, just look at the boiler.*
- Reduce Motion: card crossfades to the row, count updates, haptic unchanged.

### 9. Object opening
- Object thumbnail → hero: matched geometry, corner radius large → 0, the image grows edge-to-edge (380 ms `gentle`); title moves from card position to hero position; the rest of the page fades in from 40 %.

### 10. Procedure start (Do)
- Start: **Haptic: medium**. The procedure hero expands to full-screen (380 ms) while the step counter "1 of N" counts in with monospaced digits.
- Step change (Done / swipe): current instruction slides out 24 pt with fade (180 ms exit), next slides in (260 ms standard); media crossfades. **Haptic: selection.** Progress segment fills with `snappy`.
- Auto-completion: *Looks good — 1.5 bar* chip rises with a signal tick; **Haptic: success** (soft variant: .success at intensity 0.7). Next step is offered, not forced.

### 11. Procedure completion
- Last Done: the screen resolves to `backgroundPrimary`, a single signal line draws the Loop at 120 px in 520 ms, closes with **Haptic: success**. *Done.* / *You didn't have to remember.* No confetti.

### 12. Micro-interactions
- Press: cards scale 0.97, buttons 0.985, opacity 0.92, 120 ms; release with `snappy`.
- Long press: **Haptic: light** at 350 ms, context menu blooms from the touch point.
- Favourite: symbol morph outline → fill with a 1.15 scale beat (180 ms).
- Reorder: row lifts (scale 1.03, `floating` shadow), **Haptic: selection** at each detent.
- Pull to refresh (only where refresh means something): the Loop draws proportionally to pull distance and completes on release.
