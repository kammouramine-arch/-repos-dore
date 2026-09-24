# Prototype visual review

Method: `review/shoot.mjs` loads every screen and state in light and dark at 2×, waits for the
entrance animation, screenshots the phone, and fails on any console error. The captures live in
`shots/` (106 JPEG captures at 2×) and are arranged in `contact-sheet.html`. Each pass was inspected against
the brief's per-screen checklist (§129): hierarchy in under two seconds, obvious primary action,
real data, dark mode, motion, haptic sense, empty/loading/error/offline states, coherence.

## Pass 1 → fixes applied

| Finding | Fix |
|---|---|
| Recognition contour was a straight-edged polygon drawn around the wrong region | Hull redefined around the cylinder + gauge; contour is now a closed Catmull-Rom spline; label became a glass pill near the object |
| Onboarding scene 2 transcript collided with the headline; scene 3 list overlapped the headline and the "Looking…" pill stayed | Positions moved; pill fades once recognition lands |
| `hidden` was defeated by `.btn { display: inline-flex }` so "Remember this" and the timer showed before recording | Global `[hidden] { display: none !important }` |
| Recording transcript overlapped the marker button; captions hard to read over the photo | Overlays re-stacked (ribbon 168, transcript 196, marker 292) and a bottom shade added to the camera |
| Back control overlapped the large title on every pushed screen | Screens with a top bar inset content by 112 pt |
| Memory subtitle read "Your world remembers 24 things. · 3 spaces" | Subtitle is now "24 things · 3 spaces · 87 memories"; copy keys split |
| "thing dad showed me for boiler" ranked espresso memories first | Token-overlap scoring; "Restart after lockout" is taught by Dad (matches DoOnceCore sample data) |
| Procedure meta line wrapped awkwardly | Two-line taught-by block |
| "1 objects" | Pluralised via strings |
| Notification titles truncated | Rows may wrap titles |
| Brand marks rendered at 22 px inside 44–56 px containers | `.mark` sizing rule |
| Dark mode: text over photos used `textOnInverse`, which is ink in dark mode | New token `textOnMedia` (always bone); on-inverse reserved for inverse surfaces. Same fix flows to `Tokens.swift` |
| Hands-free toast covered the step counter | Removed; the bar already says hands-free is on |

## Pass 2 — state of every screen

All 53 screens/states render without console errors in both themes. Checked in particular:

- Launch: mark draws, snaps, echoes; skip works; Reduce Motion crossfades.
- Onboarding: the intelligence demo (chips, transcript highlight), the recognition demo and the
  Do demo read clearly over the photographs at 393 pt; dots and Continue never collide.
- Memory: greeting, search, Continue, object cards, spaces, people, timeline; empty and offline
  variants; tab bar clears content.
- Look: looking → recognised (contour, pulse, label, sheet) / uncertain (Yes / No) / unknown /
  error, all with calm copy and a next action.
- Teach: pre-record, recording (timer, pulse, observations, ribbon ticks, marker), stop →
  processing (real transcript streaming, step ticks, frames lifting), review (observed / inferred /
  unclear; original clip), edit mode, object creation, save moment.
- Do: step, warning callout, auto-completion chip, hands-free bar, Ask sheet with source
  timestamp, See original, completion loop.
- You: profile, settings, privacy, haptics, notifications, subscription, paywall, household,
  share, QR import; offline and error states; permission education.

## Known limitations of the prototype

- Photographs are Unsplash placeholders (see `assets/photos/CREDITS.md`).
- Camera, recognition and processing are simulated on timers; the real pipeline lives in
  `ios/DoOnce/Sources/Services` and `ios/DoOnceCore`.
- Inter stands in for SF Pro; on device the app uses the system font.
- Dynamic Type and VoiceOver are not exercised here; they are handled in SwiftUI through the
  `.ds` font styles and accessibility labels.
