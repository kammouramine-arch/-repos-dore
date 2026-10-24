# THE UNKNOWN FILE — SOMEONE IS IN THE POOL

This is a three-episode horror miniseries. Each episode is a separate vertical video:
- 1080×1920, 30 fps, H.264/AAC, English only;
- no music, no intro, no logo, no watermark, no outro;
- frame 0 is the first narrated sentence, and each episode hard-cuts to black on its final scare.

| Episode | File | Cover / thumbnail |
|---|---|---|
| NIGHT 1 — "SOMEONE IS UNDER THE POOL" | `deliverables/SOMEONE_IS_IN_THE_POOL_NIGHT_01.mp4` | `deliverables/POOL_NIGHT_01_COVER.png` |
| NIGHT 2 — "THE POOL IS EMPTY. SO WHO IS THAT?" | `deliverables/SOMEONE_IS_IN_THE_POOL_NIGHT_02.mp4` | `deliverables/POOL_NIGHT_02_COVER.png` |
| NIGHT 3 — "IT FOLLOWED YOU HOME" | `deliverables/SOMEONE_IS_IN_THE_POOL_NIGHT_03.mp4` | `deliverables/POOL_NIGHT_03_COVER.png` |

`deliverables/` also holds:
- separate stems for each night: narration, ambience and effects;
- the English transcripts.

The documentation is in `docs/`: `STORYBOARDS.md`, `PRODUCTION_BIBLE.md`, `LICENSE_REGISTER.md`, `QC_CHECKLIST.md` and `QC_REPORT.md`.

## Editable project files
| What | Where |
|---|---|
| Indoor pool, security office, corridor, CCTV cameras (one floor plan) | `blender/pool.blend` ← `blender/pool_set.py` |
| The guard's flat, bathroom, building corridor, stairwell, street, car | `blender/apartment.blend` ← `blender/apartment_set.py` |
| Character rigs: the guard and the woman in white, with IK, finger rig and props | `blender/characters.blend` ← `blender/characters.py`, `rigkit.py`, `actor.py`, `poses.py` |
| Effects: ring waves, the hand under the tiles, hanging hair, drips, wet decals, upside-down poses | `blender/fx.py`, `tools/make_textures.py` |
| Animation scene files (every 3D shot of a night baked on one timeline, with cameras and markers) | `blender/scenes/p1_animation.blend`, `p2_…`, `p3_…` (and `p3_pool_animation.blend`) ← `blender/bake_episode.py` |
| Shot scripts (one documented function per shot, timed to the narration) | `blender/p1_shots.py`, `p2_shots.py`, `p3_shots.py`, `shotkit.py` |
| Edit (Remotion): episode timelines, CCTV on-screen display, phone UI, covers | `studio/src/edit/P1.tsx`, `P2.tsx`, `P3.tsx`, `kit.tsx`, `studio/src/ui/Phone.tsx`, `studio/src/Covers.tsx` |
| Sound design (procedural) and cue sheets | `tools/sfx.py`, `tools/cues_p1.py`, `cues_p2.py`, `cues_p3.py`, `tools/mix.sh` |

The rebuild order is in `docs/PRODUCTION_BIBLE.md`.
