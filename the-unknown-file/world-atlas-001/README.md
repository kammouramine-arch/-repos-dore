# THE UNKNOWN FILE — WORLD ATLAS #001 · THE GAMBIA

**Why does this country look like this?** A vertical animated-map documentary short (9:16, 1080×1920, about 2:13).

## Deliverables (`deliverables/`)

| File | Description |
|---|---|
| `THE_UNKNOWN_FILE_WORLD_ATLAS_001_GAMBIA.mp4` | Final video: TikTok / Reels / Shorts, 1080×1920, 30 fps, H.264 + AAC |
| `WORLD_ATLAS_001_GAMBIA_VERTICAL_COVER.png` | 9:16 cover: "WHY DOES THIS COUNTRY LOOK LIKE THIS?" |
| `WORLD_ATLAS_001_GAMBIA_NARRATION.wav`, `_SFX.wav`, `_MUSIC.wav` | Separate stems, level-matched to the mix |
| `LICENSE_REGISTER.md` | Map data, imagery, music and SFX licences, plus a historical fact-check with sources |
| `TRANSCRIPT_EN.md` | English transcript with timecodes |

## Editable project

```
studio/                         Remotion (React + SVG); the whole film is one living map
  src/Gambia.tsx                the edit: camera path + every layer, keyed to narration phrases (data/tokens.json)
  src/map/engine.tsx            map engine: Web-Mercator world space (z=12 px), camera (lon, lat, zoom, tilt),
                                terrain level-of-detail, tinted territories, drawn-on borders/rivers, labels, arrows
  src/ui.tsx                    screen-space titles, captions, archive cards, stamps, flag of The Gambia
  src/Cover.tsx                 vertical cover
  public/terrain/*.jpg          shaded-relief rasters (Africa → West Africa → Senegambia → The Gambia)
  public/hist/*.jpg             public-domain historical images (Library of Congress)
  public/fields/*.png           pre-rendered soft colonial-influence fields
tools/
  terrain.py                    terrain tiles → hillshaded vintage-atlas rasters
  geo.py                        Natural Earth + geoBoundaries + OSM → studio/src/data/geo.json
  softfield.py                  soft-edged French-influence fields
  transcribe.py                 word-timed transcript (faster-whisper)
  music.py (score_gambia)       original score, composed in code
  sfx.py + cues_gambia.py       original sound design + phrase-keyed cue sheet
  mix.sh                        narration + SFX + score → mix (−14 LUFS, −1 dBTP) and stems
  render.sh                     chunked, resumable render
```

## Rebuild

```bash
cd studio && npm ci                     # this checkout symlinks node_modules locally; run npm ci in a fresh clone
npx remotion studio                     # preview and edit
cd .. && tools/render.sh Gambia 4008 ../renders/parts 500 16
tools/mix.sh gambia audio/WORLD_ATLAS_001_GAMBIA.mp3 133.6 2.9 -20
# concatenate renders/parts (ffmpeg concat), then mux with audio/master/gambia_mix.wav
```

Re-creating the geo data needs the Natural Earth downloads in `assets/ne/` (see `tools/geo.py`). The OSM and geoBoundaries extracts are included in `assets/`.
