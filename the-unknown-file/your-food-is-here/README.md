# THE UNKNOWN FILE — YOUR FOOD IS HERE

This is a three-episode psychological horror miniseries. Each episode is a separate vertical video: 1080×1920, 30 fps, H.264/AAC, in English only, with no music, no intro and no outro.

| Episode | File | Cover |
|---|---|---|
| NIGHT 1 — THE WRONG DRIVER | `deliverables/YOUR_FOOD_IS_HERE_NIGHT_01.mp4` | `deliverables/NIGHT_01_COVER.png` |
| NIGHT 2 — THE DELIVERY PHOTO | `deliverables/YOUR_FOOD_IS_HERE_NIGHT_02.mp4` | `deliverables/NIGHT_02_COVER.png` |
| NIGHT 3 — DO NOT CONFIRM | `deliverables/YOUR_FOOD_IS_HERE_NIGHT_03.mp4` | `deliverables/NIGHT_03_COVER.png` |

Each episode starts on its first story frame, with the narration from frame 0, and cuts to black right after its final scare.

`deliverables/` also contains:
- separate stems for each night: narration, ambience and effects (`*_NARRATION.wav`, `*_AMBIENCE.wav`, `*_EFFECTS.wav`);
- English transcripts;
- `LICENSE_REGISTER.md`;
- `PRODUCTION_BIBLE.md` and `FLOOR_PLAN.png`.

## Editable project files

| What | Where |
|---|---|
| Apartment 6A + 6th-floor corridor (one floor plan) | `blender/apartment.blend` ← `blender/apartment.py` |
| Character rigs: protagonist + courier, with IK, finger rig and props | `blender/characters.blend` ← `blender/characters.py`, `rigkit.py`, `actor.py` |
| Animation scene files (every 3D shot of a night, baked on one timeline, with cameras and markers) | `blender/scenes/n1_animation.blend`, `n2_…`, `n3_…` ← `blender/bake_episode.py` |
| Shot scripts (one documented function per shot) | `blender/n1_shots.py`, `n2_shots.py`, `n3_shots.py`, `shotkit.py` |
| Compositing / edit (Remotion): episode timelines, phone UI, covers | `studio/src/edit/N1.tsx`, `N2.tsx`, `N3.tsx`, `studio/src/ui/Phone.tsx`, `studio/src/Covers.tsx` |
| Sound design (procedural) and cue sheets | `tools/sfx.py`, `tools/cues_n1.py`, `cues_n2.py`, `cues_n3.py`, `tools/mix.sh` |
| Narration edit (Night 3's "Night three," removed) | `tools/edit_narration.sh` |

See `docs/PRODUCTION_BIBLE.md` for:
- the world, characters and rig;
- the camera rules;
- the render budget;
- the rebuild order.

## Rebuild (summary)
```bash
blender -b --python blender/characters.py && blender -b --python blender/apartment.py
tools/queue.sh <pid>            # or tools/render_ep.sh n1|n2|n3 ...  (photos → UI textures → 3D shots)
python3 tools/prep_shots.py n1  # 30 fps interpolation, doorbell look
tools/edit_narration.sh && tools/mix.sh n1 audio/edited/N1_narration.wav 128.3 0
tools/render.sh N1 3849 renders/n1_parts && tools/finish.sh 1
```
