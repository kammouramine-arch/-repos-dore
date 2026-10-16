# meepmeep brand sounds

`meepmeep-launch.wav` — the launch cue. Fully synthesised by
`scripts/generate-launch-cue.mjs` (two original bell-like tones, E6 → A6); no
samples or recordings are used and it does not imitate any existing sound
effect. Regenerate with `node scripts/generate-launch-cue.mjs`.

The speed-warning tone is synthesised at runtime in `AvyroWakeModule.swift`
(`alertTone()`), so no file is shipped for it.
