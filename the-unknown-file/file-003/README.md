# THE UNKNOWN FILE — FILE #003 · The Man Who Survived Seven Lightning Strikes

The true story of Roy C. Sullivan, a park ranger in Shenandoah National Park, Virginia, struck by lightning seven recorded times between 1942 and 1977. He survived every strike and is recognised by Guinness World Records for "most lightning strikes survived".

## Deliverables (`deliverables/`)
| File | What it is |
|---|---|
| `THE_UNKNOWN_FILE_003_SHORT.mp4` | Vertical short: 1080×1920, 30 fps, about 1:42. Narration plus original SFX, −14 LUFS. |
| `THE_UNKNOWN_FILE_003_YOUTUBE_FULL.mp4` | Documentary: 3840×2160, 24 fps, about 9:26. Narration plus original SFX, −14 LUFS. |
| `THE_UNKNOWN_FILE_003_YOUTUBE_THUMBNAIL.png`, `THE_UNKNOWN_FILE_003_VERTICAL_COVER.png` | 16:9 thumbnail ("STRUCK 7 TIMES. SURVIVED.") at 1280×720, under YouTube's 2 MB limit; 9:16 cover ("STRUCK BY LIGHTNING 7 TIMES") at 1080×1920 |
| `THE_UNKNOWN_FILE_003_YOUTUBE_THUMBNAIL_1920x1080.png` | Full-resolution thumbnail master |
| `*_NARRATION.wav`, `*_SFX.wav` | Separate stems: narration master and SFX (ducked, as mixed). There is no music stem: the episode has no music. |
| `TRANSCRIPT_EN_SHORT.md`, `TRANSCRIPT_EN_LONG.md` | English transcripts with timecodes |
| `LICENSE_REGISTER.md` | Every external asset with its source and licence, the music decision, and the fact-check |
| `PUBLISHING_KIT.md` | Titles, descriptions, chapters and the required CC BY credits |

Hard rules for this episode:
- **English only:** no subtitles, no French text, no SRT files.
- **Narration untouched:** no words cut, repeated or sped up.
- **No music:** the soundtrack is narration plus original sound design only.
- **The only photo of Roy Sullivan is real:** the NPS public-domain photograph. No generated portrait is used.
- **Reenactments are labelled:** every one is marked ILLUSTRATIVE RECONSTRUCTION, with anonymous silhouettes and period stand-ins.

## Editable project
```
studio/                          Remotion (React + three.js)
  src/short/Short.tsx            vertical short — every shot keyed to narration phrases (data/short.tokens.json)
  src/long/Long.tsx              4K documentary — SHOTS list is the edit decision list (data/long.tokens.json)
  src/components/Storm.tsx       storm engine: seeded bolts (stepped leader → return strokes → afterglow), scene flash,
                                 rain, photo plates on a shared camera, cloud glow
  src/three/Person.tsx           anonymous reenactment figures: Quaternius CC0 mannequin + mocap clips, campaign hat,
                                 rendered as clean storm-lit silhouettes
  src/scenes/Strike1.tsx         1942 lookout tower (fire = real 1954 USFS flames)
  src/scenes/Strikes.tsx         1969 road / cab / watch · 1970 garden + transformer arc · 1972 guardhouse · 1973 patrol
                                 · 1976 trail · 1977 stream pool
  src/scenes/Story.tsx           opening storm, ranger silhouette, the "7", NPS photo of Roy, Virginia → park maps,
                                 years passing, seven-strike timeline
  src/scenes/Science.tsx         NWS-based illustrations: charge/leader/return stroke, injury mechanisms, body effects,
                                 survival statistic, vehicle shell, physical factors, odds
  src/components/UI.tsx          strike counter, year cards, labels, injury-record card, emphasis typography
  src/Covers.tsx                 thumbnail + vertical cover
  public/                        photos, cut-outs (skies removed), footage clips, maps, mannequin, narration
tools/
  transcribe.py / recheck.py     word-timed transcript (faster-whisper) + spot re-checks of short windows
  flickr_get.py / flickr_search.py / ia_search.py   sourcing with provenance (assets/provenance.jsonl)
  cutouts.py / glass.py          sky replacement / object cut-outs (rembg, OpenCV) / truck windscreen
  map3.py                        shaded-relief maps + state and park vectors
  prep_footage.sh                cut + transcode archive footage
  sfx.py + cues_short.py / cues_long.py   original sound design (storm kit) keyed to narration phrases
  mix.sh                         narration + SFX → −14 LUFS mix (no music)
  render.sh                      chunked, resumable render
  transcript.py                  English transcripts
```

## Rebuild
```bash
cd studio && npm ci          # this checkout symlinks node_modules from file-002; run npm ci in a fresh clone
npx remotion studio          # preview / edit
cd .. && tools/render.sh Short 3072 ../renders/short_parts 512 16
tools/render.sh Long 13594 ../renders/long_parts 240 18
tools/mix.sh short audio/UNKNOWN_FILE_003_SHORT.mp3 102.4 2.9
tools/mix.sh long  audio/UNKNOWN_FILE_003_LONG.mp3 566.4 9.8
# concatenate the parts (ffmpeg concat demuxer), then mux each with audio/master/<name>_mix.wav
npx remotion still src/index.ts Thumb out/thumb.png && npx remotion still src/index.ts Cover out/cover.png
```
