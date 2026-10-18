# THE SKIP BUTTON — asset & music licence register

**Summary:** everything you see and hear in both films was made in this project, except:
- the narration, which you supplied;
- three open-licence fonts.

There is **no music**. No stock footage, photos, clip art, sound libraries, AI-generated images or third-party characters were used.

## Narration
| Item | Source | Use |
|---|---|---|
| `THE_SKIP_BUTTON_SHORT.mp3`, `THE_SKIP_BUTTON_LONG.mp3` | Supplied by the channel (ElevenLabs voice) | Used unchanged: same words, same timing, no re-generation. Only gain and peak limiting were applied in the mix. |

## Music
**None.** The films use narration and original sound design only.

The brief allowed licensed music only if commercial rights for YouTube, YouTube Shorts, Instagram Reels and TikTok could be verified and recorded. No track's licence could be verified from this environment, so music was left out. Leaving it out also matches the channel's recent no-music releases.

## Character
| Item | Source | Notes |
|---|---|---|
| Protagonist design | Channel's reference image (`assets/reference/character_reference.jpg`) | Re-drawn as an original vector rig in `studio/src/rig/`. No image generator was used. |
| Mom, Dad, friends, extras | Original, same rig | Same line style and proportions. Only wardrobe and hair differ. |

## Visuals
All visuals are original SVG code in `studio/src/`:
- the 2D character rig, sets and props;
- the phone UI and the photo-gallery images (each "photo" is a small drawing of the film's own characters);
- the SKIP effect and the title cards.

The film-grain and paper textures (`studio/public/tex/`) are procedural noise images generated for THE UNKNOWN FILE projects.

## Sound
All sound effects are synthesised from noise and decaying resonances by `tools/sfx.py`; no samples or library loops are used. This covers:
- taps and button presses, the SKIP time-jump, notification pings and ringing;
- clock ticks, footsteps, doors, cups and chairs;
- room tones for the café, office, bus, park, street, apartment, bathroom and kitchen.

## Fonts (embedded in the renders)
| Font | Licence |
|---|---|
| Inter | SIL Open Font License 1.1 |
| IBM Plex Mono | SIL Open Font License 1.1 |
| Instrument Serif | SIL Open Font License 1.1 |

## Fiction
THE SKIP BUTTON is an original fictional story. The people, messages, dates, contact names (e.g. "Aunt Clara") and places are invented. The phone interface is generic and imitates no real brand or app.
