# THE LAST BUS HOME — asset & music licence register

**Summary:** everything you see and hear in the three episodes was made in this project, except:
- the three narrations, which you supplied;
- open-licence fonts.

There is **no music**. No stock footage, photos, 3D model packs, textures, sound libraries, AI-generated images or third-party characters were used.

## Narration
| Item | Source | Use |
|---|---|---|
| `THE_LAST_BUS_NIGHT_01.mp3`, `_02.mp3`, `_03.mp3` | Supplied by the channel (ElevenLabs voice) | Used unchanged: same words, same timing, no re-generation. Only gain and peak limiting were applied in the mix. |

## Music
**None.** The episodes use narration and original sound design only.

The brief allowed music only if a commercial licence could be verified. No track's licence could be verified from this environment, so music was left out.

## Reference videos
The two French TikTok references mentioned in the brief were not among the uploaded files, so they could not be studied. Nothing was copied from them: the characters, places, dialogue staging and shots are original.

## 3D environments (Blender)
All environments are built procedurally by `blender/build_sets.py` (Blender 4.2 LTS, Cycles) from primitive shapes and procedural shader nodes. This covers:
- the bus (interior, exterior shell, doors, cord, clock);
- the station platform and both streets;
- the apartment and the bathroom.

There are no imported models, HDRIs, image textures or scanned materials. The rendered plates and the two Cycles animations (`blender/plates/`) are outputs of that script.

## Characters and 2D animation
The protagonist, his double, the driver and the roommate are original vector designs drawn by a code rig (`studio/src/rig/`, the series' in-house rig).
- The double uses the protagonist's design object itself, so the two are identical; only their behaviour differs.
- The phone interface is generic and imitates no real brand or app.
- The phone number shown, (555) 014-2209, is in the fictional 555-01xx range.

## Sound
All sound effects are synthesised from noise and decaying resonances by `tools/sfx.py` (no samples or library loops). This includes:
- the bus engine, hydraulic doors, air brakes and the stop-request bell;
- fluorescent hum and flicker, station air, rain and window rattle;
- footsteps, clothing, phone vibration, notification and ringing;
- the low "dread" rumble, which is non-musical: no pitch line, no rhythm.

## Fonts (embedded in the renders)
| Font | Licence |
|---|---|
| Inter | SIL Open Font License 1.1 |
| IBM Plex Mono | SIL Open Font License 1.1 |

## Software
- Blender 4.2 LTS (GPL; rendered output is not covered by the GPL).
- Remotion 4 (check that the channel's Remotion licence tier covers commercial use).
- FFmpeg.

## Fiction
THE LAST BUS HOME is an original fictional story. The people, places, messages and the phone number are invented.
