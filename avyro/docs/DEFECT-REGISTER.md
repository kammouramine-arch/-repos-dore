# meepmeep — defect register (overhaul, 2026-10-16)

Evidence: the five recordings supplied with the overhaul brief. Timestamps are
mm:ss into each file. "Status" says what has been shown, not hoped:

- **Fixed — unit-tested**: root cause found in code, fix committed, tests
  reproduce the failure and pass. **Not yet observed on a phone.**
- **Mitigated**: a safeguard bounds the failure; the original trigger was not
  proven from the evidence available.
- **Open**: not fixed in this pass.

No row below has been verified on hardware. Every test is a unit test or a
replay of a *synthetic* trace; none is a device or road recording.

| Recording | What it is |
|---|---|
| LRWF0930 (1:23) | meepmeep drive, voice use, wrong "home" |
| EJXG3453 (1:24) | meepmeep drive, turn-by-turn |
| KZKG2026 (1:54) | Waze on the same streets, for comparison |
| IIEQ5865 (0:20) | TikTok intro, reference for the brand entrance |
| MHZI5176 (0:09) | Siri edge glow, reference for the voice animation |

---

### D1 — "Take me home" routed to a business called "Home For Childminders"
- **Seen**: LRWF0930 1:02 transcript "Take me to home"; 1:06 route to "Home For Childminders Lille".
- **Cause**: the phrase parsed as a place search for `home`. The hosted classifier can produce the same intent, because its only check is that the query appears in the transcript. The geocoder returned the nearest business whose name contains "Home".
- **Fix**: `savedPlaceAlias` (EN/FR) is applied in the parser, the French parser and the resolver that every producer converges on. Home and Work are only ever the saved slots. If none is saved, meepmeep asks you to set one and never searches. `91e679d`
- **Tests**: `homeResolution.test.ts` (62). Covers 18 EN/FR phrasings, a decoy geocoder that must never be called, offline, missing Home, restart persistence, change, delete, and "Home Depot" still searchable. All fixtures are invented.
- **Note**: the earlier wrong destination may still be in Recents. Clear it with "Effacer".
- **Status**: Fixed — unit-tested.

### D2 — Voice reply card stays on the map permanently
- **Seen**: LRWF0930 0:00–0:42; EJXG3453 whole drive ("Keep straight on at Avenue Denis Cordonnier").
- **Cause**: speech completion was keyed to the *microphone* session counter, so any mic activity while speaking discarded both the TTS callback and its watchdog. The watchdog also lived in the timer list that `stop-listening` clears. The machine was stranded in `speaking` / `navigation-interrupt`.
- **Fix**: `speechCompletion` gives each utterance its own token. The watchdog is sized to the sentence (6–30 s), so valid speech is never cut short, and it is kept apart from mic timers. The card is tap-to-dismiss. Spoken maneuvers are no longer copied into the card. `511e9fb`
- **Tests**: `speechCompletion.test.ts`, `voicePrompt.test.ts`.
- **Status**: Fixed — unit-tested.

### D3 — Spoken guidance in English under a French banner
- **Seen**: EJXG3453 throughout (banner "Tournez à droite…", voice and card "Keep straight on…").
- **Cause**: 'bilingual' voice followed the device locale; the banner follows the interface language.
- **Fix**: `guidanceLanguageFor` — one rule (the interface language) for turn guidance and for speed warnings. `511e9fb`, `d6211b1`
- **Status**: Fixed — unit-tested indirectly; device check pending.

### D4 — Right-turn instruction drawn with a left arrow
- **Seen**: EJXG3453 1:06–1:20. "Tournez à droite sur Rue Roland Garros" with a ↰ glyph, while the "Puis" row shows ↱ correctly. Right turns at 0:02 render correctly; the bug appears only after the left turn at 0:32.
- **Cause**: `ManeuverIcon` passed `transform={undefined}` for unmirrored glyphs. iOS react-native-svg keeps the previous native transform. The "then" row remounts each step, so it was unaffected.
- **Fix**: an explicit identity transform, plus a remount per maneuver. `8e904a0`
- **Tests**: `maneuverGlyphs.test.ts` (arrow tip direction for all six turn types).
- **Status**: Fixed — unit-tested; the native behaviour is inferred from the frame sequence.

### D5 — "Turn right onto" the road you are already on
- **Seen**: EJXG3453 0:02–0:22, "Tournez à droite sur Avenue Denis Cordonnier" while on Avenue Denis Cordonnier. The drawn route only jogs across a boulevard.
- **Cause**: the provider labels from its junction model, which disagrees with its own line.
- **Fix**: `reconcileManeuvers` measures deflection from the route geometry (±30 m). A full or sharp turn onto the *same* road with less than 25° deflection becomes "Continue straight". Nothing is removed. Bear/fork steps and provider left/right are never changed. `8e904a0`
- **Tests**: `maneuverGeometry.test.ts`. The genuine 90° corner on the same-named road (EJXG 0:32) is kept.
- **Status**: Fixed — unit-tested.

### D6 — "then rue lindbergh" lower-cased
- **Seen**: EJXG3453 banner second line.
- **Fix**: only the first letter is lower-cased. `8e904a0`
- **Status**: Fixed.

### D7 — Speed limit blank most of the time ("Limite —")
- **Seen**: EJXG3453 all sampled frames. KZKG2026 (Waze) shows a steady 30 on the same streets.
- **Cause**: one lookup every 12 s, but each result was discarded after 5 s or 15 m (about 2 s at 30 km/h). So the limit was blank roughly 80% of the time.
- **Fix**: the gateway returns the matched TomTom element geometry. The app keeps the limit while fresh, accurate fixes lie on that element in its direction, and clears it at either end, on a turn-off, on a parallel road or on a weak fix. It re-confirms every 2 min. If the geometry does not reach 30 m ahead, it falls back to the old rule, because the TomTom docs do not say whether elements are clipped. Unknown is still shown as "—". `d6211b1`
- **Needs**: a **gateway redeploy** (`backend/cloud`, `wrangler deploy`). Until then the app behaves exactly as before.
- **Tests**: `roadEvidence.test.ts`, `road-data.test.mjs`.
- **Status**: Fixed — unit-tested; requires deploy, then a device check.

### D8 — Overspeed warning flickers and re-fires
- **Cause** (code review): a single fix over the limit with no margin, no hysteresis and no accuracy gate.
- **Fix**: the `overspeedMonitor` rules:
  - It never warns on an unknown limit.
  - It enters at +3 km/h (+2 mph) sustained for 2 s, and exits at ≤ +1.
  - Fixes worse than 20 m are ignored.
  - There is a 60 s cooldown, except that an immediate warning fires when the limit drops.

  A new setting chooses visual, tone or voice. The tone is synthesised natively. The limit chip now says "signs prevail". `d6211b1`
- **Tests**: `overspeedMonitor.test.ts` (13 fixture traces; no one was asked to speed).
- **Status**: Fixed — unit-tested.

### D9 — Camera steps and re-centres in jumps; car drifts from centre
- **Seen**: LRWF0930 and EJXG3453 motion (frame-difference review).
- **Cause**: the camera tweened 650 ms toward each ~1 Hz fix and then stopped, while the marker ran a separate tween. Heading was unsmoothed.
- **Fix**: one per-frame pose (`followPose`) drives both the arrow and the camera (15 Hz). It never extrapolates past the latest fix. Heading is filtered, with a dead-band and a rate limit on the camera. `f73ce11`, `67a20cb`
- **Tests**: `followPose.test.ts` (synthetic 1 Hz traces sampled at 60 fps).
- **Status**: Fixed — unit-tested; smoothness on a phone **not yet verified**.

### D10 — Cartoon car puck
- **Fix**: an original faceted `NavigationArrow`, geo-anchored, with light and dark variants. Preview: `docs/navigation-arrow-preview.png`. `f73ce11`
- **Status**: Done; visual check on device pending.

### D11 — Header stuck on "Connexion vocale…", hands-free never armed
- **Seen**: LRWF0930 header, whole recording.
- **Cause**: the voice session's `preparing` state had no exit. Exactly which callback was lost could not be proven from video.
- **Fix**: a 10 s preparation watchdog hands over to the existing retry path, and Voice diagnostics records which step stalled. `37e8c50`
- **Status**: Mitigated.

### D12 — Static voice edge
- **Fix**: an audio-reactive edge with a gated envelope from the live mic, distinct thinking and speaking looks, light and dark palettes, and reduced motion. `2e14733`
- **Status**: Done; device check pending.

### D13 — Road signs and traffic lights disappeared
- **Cause**: deliberately disabled in an earlier version (`useRoadAhead` returns nothing). Snap to Roads on the *planned* line proves neither where the car drove nor that a sign faces this approach.
- **Decision**: they are **not restored** in this pass. No direction-verified sign or signal source is configured, and the brief says absence beats a false sign. Signal colours are never shown.
- **Status**: Open (by design).

### D14 — Intro
- **Fix**: an original card, car and mark entrance with a synthesised two-note cue (`scripts/generate-launch-cue.mjs`). It replaces a WAV whose origin was unrecorded. It plays once per cold launch, respects readiness, and supports reduced motion. `14c7f9a`
- **Status**: Done; device check pending.
