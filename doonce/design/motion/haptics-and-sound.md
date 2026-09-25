# DoOnce — Haptic and sound language

Haptics fire only with a visible change and at the exact frame the change lands. Nothing vibrates on plain touch-down. Settings → Haptics: Full / Reduced / Off. Reduced removes `selection` and `light`. System accessibility settings win.

| Event | Haptic | Sound (optional, respects silent mode) |
|---|---|---|
| Logo loop closes | rigid | crystalline tick (−22 dB) |
| Picker move, snap, switch target, scrub | selection | — |
| Button commit, card locks, centre menu opens | light | — |
| Recording starts | medium | low pulse, 90 ms |
| Object recognised | medium | soft lock-in, 140 ms |
| Procedure starts | medium | — |
| Step confirmed (manual) | selection | — |
| Step confirmed (auto, vision) | success @ 0.7 | — |
| Memory created | success | soft completion tone |
| Procedure completed | success | soft completion tone |
| Object linked | success | — |
| Dangerous step shown | warning | — |
| Recognition incomplete, missing info | warning | — |
| Real failure (upload lost, camera dead) | error | — |
| Marked moment during recording | selection | — |
| Recording stops | light | — |

Never: haptic on scroll, on every list row, on keyboard, on tab switch, on toast appear.

Core Haptics patterns (for the three signature moments) live in `ios/DoOnce/Sources/Services/Haptics/Patterns.swift` as AHAP-style transient/continuous events so that the recognition lock and save settle feel identical across devices.

Sound files are not part of this delivery; the spec sets their character: quiet, short, no melody, no game feel. Sounds default to on with the ringer, off in silent mode, and can be disabled independently in Settings.
