# THE UNKNOWN FILE — HORROR STORIES: THE LAST BUS HOME

Three separate vertical episodes (1080×1920, 30 fps, H.264/AAC), English only, no music:

| Episode | File | Cover |
|---|---|---|
| NIGHT 1 — THE EMPTY SEAT | `deliverables/THE_LAST_BUS_HOME_NIGHT_01.mp4` | `deliverables/NIGHT_01_COVER.png` |
| NIGHT 2 — THE REPLACEMENT | `deliverables/THE_LAST_BUS_HOME_NIGHT_02.mp4` | `deliverables/NIGHT_02_COVER.png` |
| NIGHT 3 — THE FINAL STOP | `deliverables/THE_LAST_BUS_HOME_NIGHT_03.mp4` | `deliverables/NIGHT_03_COVER.png` |

Also in `deliverables/`:
- separate narration and SFX stems (`*_NARRATION.wav`, `*_SFX.wav`) for each night;
- English transcripts (`TRANSCRIPT_EN_NIGHT_0N.md`);
- `LICENSE_REGISTER.md`;
- `CHARACTER_SHEET.png` (turnaround of the four characters).

## How it is made
The project combines three tools:

1. **Blender**, for the sets. `blender/build_sets.py` builds every set procedurally into `blender/sets.blend`, so the same bus appears in all three nights: seats, windows, doors, the yellow cord and the 2:16 clock are generated from one function. The sets are:
   - the bus (interior and exterior);
   - the station platform;
   - the station street and his street;
   - the apartment;
   - the bathroom.

   The script renders camera plates with Cycles, plus foreground layers, glass/door/mirror masks and the exact camera data (`blender/plates/cams.json`). The bus arrival and departure are real Cycles animations.
2. **Remotion**, for the characters and compositing (`studio/`).
   - Characters are a reusable vector rig (`studio/src/rig/`). Their looks are in `studio/src/lb/cast.ts`, and the double uses the protagonist's look object itself.
   - Characters are placed in the plates by projecting real 3D points with the exported cameras (`studio/src/lb/place.ts`): feet are planted per world point, so walks don't slide.
   - Reflections are mirrored figures clipped to the rendered glass/mirror masks.
   - Episode timelines are `studio/src/n1|n2|n3/`, keyed to the narration word timings in `data/n0N.words.json`.
3. **Sound**, procedural SFX (`tools/sfx.py` with cue sheets `tools/cues_n1|2|3.py`), mixed by `tools/mix.sh`. The narration is untouched apart from gain and limiting, and the mix is −14 LUFS.

## Rebuild
```bash
# sets + plates (Blender 4.2, Cycles CPU)
blender -b --python blender/build_sets.py -- all --res 1080x1920 --samples 16
blender -b --python blender/build_sets.py -- anim_arrive_station anim_depart_bldg --res 720x1280 --samples 12
python3 tools/prep_plates.py
# audio
for n in 1 2 3; do bash tools/mix.sh n$n audio/THE_LAST_BUS_NIGHT_0$n.mp3 <duration> 8; done
# video (chunked, resumable) + mux
bash tools/render.sh Night1 3088 ../renders/n1_parts 600 16 && bash tools/finish.sh 1
```
Rig QC: `node studio/qc.mjs Night1` reports any limb that could not reach its target (should be 0).
