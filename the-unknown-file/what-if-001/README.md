# THE UNKNOWN FILE — WHAT IF? BONUS #001 · What if the Moon disappeared tonight?

The first episode of the WHAT IF? series. It is a hypothetical scenario informed by science, shown through original animation.

## Deliverables (`deliverables/`)

| File | Description |
|---|---|
| `THE_UNKNOWN_FILE_WHAT_IF_001_SHORT.mp4` | Vertical, 1080×1920 |
| `THE_UNKNOWN_FILE_WHAT_IF_001_FULL.mp4` | 4K, 16:9 |
| `*_NARRATION.wav`, `*_SFX.wav`, `*_MUSIC.wav` | Separate editable stems |
| `WHAT_IF_001_YOUTUBE_THUMBNAIL.png` (+ `_ALT`), `WHAT_IF_001_VERTICAL_COVER.png` | Promotional images |
| `TRANSCRIPT_EN_*.md`, `*.en.srt` | English transcripts and optional English captions |
| `LICENSE_REGISTER.md` | Music and visual asset register, plus fact-check |
| `PUBLISHING_KIT.md` | Titles, descriptions, chapters, upload notes |

## V2 revision (real footage)

| File | Description |
|---|---|
| `THE_UNKNOWN_FILE_WHAT_IF_001_SHORT_V2.mp4` | Vertical short V2, 1080×1920 |
| `THE_UNKNOWN_FILE_WHAT_IF_001_FULL_V2.mp4` | Long V2, 4K 16:9 |

V2 keeps the narration, timing, brand, characters, Earth scenes and fishing family. It replaces unclear scenes with real footage and photographs:
- **Scientists:** observatory, telescope and control-room footage, labelled ARCHIVE FOOTAGE · DRAMATIZED.
- **Beaches and tides:** real California beaches. BEFORE/AFTER tide reach is drawn on real beach footage and labelled illustrative.
- **Grunion:** real photographs of spawning and egg clutches.
- **Coral:** real NOAA reef and coral-spawning footage, a spawning-timing grid, and bleached-reef footage.
- **Night wildlife:** a night trail-camera predator.

**V2 audio has no music:** narration plus the original sound effects, −14 LUFS.

The V1 files are unchanged and kept as the approved backup. Every source and licence is listed in `deliverables/LICENSE_REGISTER.md`, section 8.

V2 code:
- `studio/src/short/ShortV2.tsx` and `studio/src/long/LongV2.tsx`: the V2 edits.
- `studio/src/components/Footage.tsx`: footage and photo layer with grade, camera move, honesty label and credit; supports overlays locked to the image.
- `studio/src/footage.ts`: registry of every clip and photo, with credit and licence.
- `studio/src/scenes/TideBeach.tsx`: real beach plus the illustrative tide-reach overlay.
- `studio/src/components/SpawnGrid.tsx`: coral colonies on a strip of nights, with real footage tiles.
- `studio/public/footage`, `studio/public/photos`: the trimmed source clips and photos (Git LFS).

## Editable project

```
studio/                       Remotion project (React + three.js + SVG)
  src/short/Short.tsx         vertical short; the SHOTS list is the edit, keyed to narration timing
  src/long/Long.tsx           4K documentary; same structure
  src/components/People.tsx   character rig (backlit silhouettes): Mia [red ribbon], adult Mia [red scarf],
                              her mother [bob], the fisherman [cap + beard], his partner [bun], their son
  src/components/Overlays.tsx knowledge tags, WHAT IF? badge, timeline markers, counters, tide chart,
                              spawning calendar, Moon-phase strip, obliquity chart
  src/scenes/                 Bedroom (the window), Town (+ news TV, observatory), Grunion (beach + egg
                              cross-section, illustrative tide model), Tides, Fishing (harbour, haul,
                              market, kitchen), Wild (night grassland)
  src/three/Reef.tsx          procedural 3D coral reef: spawning bundles, fish, caustics, reef health
  src/three/Globe.tsx         Earth / Moon / axis (NASA textures)
tools/
  transcribe.py               word-timed transcript (faster-whisper)
  music.py                    original score (composed in code)
  sfx.py + cues_*.py          original sound design and phrase-keyed cue sheets
  mix.sh                      narration + SFX + score → final mix (−14 LUFS, −1 dBTP), with stems
  render.sh                   chunked, resumable render
  captions.py                 English transcript + optional SRT
```

## Rebuild

```bash
cd studio && npm ci                       # (the repo symlinks node_modules locally; run npm ci in a fresh clone)
npx remotion studio                       # preview / edit
cd .. && tools/render.sh Short 3525 ../renders/short_parts 500 16
tools/render.sh Long 14340 ../renders/long_parts 480 17
tools/mix.sh short audio/WHAT_IF_001_SHORT.mp3 117.5 2.9 -19
tools/mix.sh long  audio/WHAT_IF_001_LONG.mp3  597.5 2.9 -19
# concatenate the parts (ffmpeg concat demuxer), then mux each video with audio/master/<name>_mix.wav
```
