# THE UNKNOWN FILE — FILE #002 · The Astronaut Who Almost Drowned in Space

Luca Parmitano, EVA 23, International Space Station, July 16, 2013.

## Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `THE_UNKNOWN_FILE_002_SHORT.mp4` | Vertical short. 1080×1920, 30 fps, ≈100 s. Narration plus original SFX. |
| `THE_UNKNOWN_FILE_002_YOUTUBE_FULL.mp4` | Documentary. 3840×2160, 24 fps, ≈11:17. Narration plus original SFX. |
| `*_NARRATION.wav`, `*_SFX.wav` | Separate stems: narration master and SFX (ducked as mixed) |
| `THE_UNKNOWN_FILE_002_THUMBNAIL_A.jpg`, `_B.jpg`, `THE_UNKNOWN_FILE_002_VERTICAL_COVER.jpg` | Thumbnails and cover |
| `*.en.srt`, `TRANSCRIPT_EN_*.md` | Optional English captions (sidecar only, not burned in) and transcripts |
| `CREDITS_AND_LICENSES.md` | Asset and licence register |
| `PUBLISHING_KIT.md` | Titles, descriptions, chapters, upload notes |

Hard rules for this episode:
- **No music** of any kind.
- **No French** anywhere: no subtitles, SRTs or on-screen text.
- **Narration untouched:** no words cut, repeated or sped up. The long version is Part 1, then 0.75 s of silence, then Part 2.
- **Recreations labelled:** every 3D shot or illustration says so on screen.
- **Archive credited:** real photos and video frames are NASA, credited on screen with their IDs.

## Editable project

```
studio/                 Remotion project (React + three.js)
  src/short/Short.tsx   vertical short — every shot keyed to narration phrases
  src/long/Long.tsx     4K documentary — the SHOTS list is the edit decision list
  src/three/Space.tsx   orbital 3D scene: Earth (day/night/clouds/glint), ISS, two EMUs, tether, helmet lamps
  src/components/       Helmet (microgravity water), SuitSystem (PLSS schematic + EVA clock), Parts (comms,
                        repress gauge, water vision, warning timeline, corrective actions), Brand (case-file seal)
  src/data/*.tokens.json  word-level timing of the narration (what all cues are keyed to)
  public/               NASA photos, NASA 3D models, NASA Earth textures, narration
tools/
  transcribe.py         word-timed transcript (faster-whisper)
  sfx.py                original procedural sound design (no samples, no music)
  cues_short.py         SFX cue sheet for the short (phrase-keyed)
  cues_long.py          SFX cue sheet for the long (phrase-keyed)
  mix.sh                narration master + SFX stem → final mix (−14 LUFS, −1 dBTP)
  render.sh             chunked, resumable, auto-retrying render
  captions.py           English transcript + optional English SRT
audio/                  supplied narration (unchanged) + the joined long narration WAV
research/               NASA MIB report, ICES-2015 paper, NTRS paper (fact sources)
```

## Rebuild

```bash
cd studio && npm ci
npx remotion studio                                           # preview / edit
cd .. && tools/render.sh Short 3000 ../renders/short_parts 500 16
tools/render.sh Long 16248 ../renders/long_parts 480 17
tools/mix.sh short audio/UNKNOWN_FILE_002_SHORT.mp3 100 2.9
tools/mix.sh long  audio/UNKNOWN_FILE_002_LONG.wav 677 2.8
# concat the parts (ffmpeg concat demuxer), then mux each with audio/master/<name>_mix.wav
```

Changing a sound:
1. Edit `tools/cues_*.py` (each event is `E(kind, time, gain_db, ...)`, timed by a narration phrase).
2. Re-run `tools/mix.sh`.
3. Re-mux. The video does not need to be re-rendered.
