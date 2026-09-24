# DoOnce — interactive prototype

The golden path at iPhone size, as a single page with no build step. It is the visual and motion
spec for the iOS app: same screens, same copy keys (`design/copy/strings.json`), same tokens
(`design/foundations/tokens.json`), same sample content (`ios/DoOnceCore` `SampleData`).

## Run

Open `index.html` in Chrome or Safari (works from disk), or:

```
cd doonce/prototype && python3 -m http.server 8000   # http://localhost:8000
```

The panel on the left is for reviewers, not part of the product: theme (auto / dark / light),
Reduce Motion, a jump list of every screen and state, a log of the haptics the app would play,
and voice buttons that simulate hands-free commands in Do mode.

## Golden path (click through)

Launch (logo forms, tap to skip) → Onboarding 1–4 (swipe or Continue) → Start with Apple →
First-use → Show DoOnce → camera permission education → Teach (tap record; live observations,
transcript, "Remember this"; stop or wait) → Processing (real staged reveal) → Review →
Remember → Object creation → Save moment → Memory home → ◉ → Look → recognition → Start →
Do mode (Done ×5, hands-free, Ask, See original) → Done.

## What is simulated

- The camera is a still photograph with handheld drift and grain. Recognition, live
  observations and the processing stages play on timers with the real sample transcript.
  Timings follow `design/motion/motion-spec.md`. Recording time runs 3× faster than real time
  so a demo takes ~16 s.
- Voice commands are buttons in the reviewer panel. Haptics are logged, not felt.
- Sign in, sharing links and purchases do nothing beyond the UI.

## Review

`node review/shoot.mjs` (needs `npm i playwright`) captures every screen in light and dark to
`review/shots/` and fails on console errors; `review/contact-sheet.html` lays them out.
`review/REVIEW.md` records the checklist pass.
