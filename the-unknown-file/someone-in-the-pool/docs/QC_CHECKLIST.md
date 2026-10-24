# SOMEONE IS IN THE POOL — QC checklist

Every item is checked on the final files in `deliverables/`. The results of the automated checks are recorded in `docs/QC_REPORT.md` by `tools/qc.sh`.

## Format
- [ ] `SOMEONE_IS_IN_THE_POOL_NIGHT_01.mp4`, `_02.mp4` and `_03.mp4` exist and play end to end (ffmpeg full decode with no errors).
- [ ] Video: H.264, 1080×1920 (9:16), 30 fps constant, yuv420p, faststart.
- [ ] Audio: AAC, 48 kHz stereo; −14 LUFS integrated (±1); true peak ≤ −1 dBTP.
- [ ] Duration is Shorts-length (under 3 minutes) and matches the narration plus the final cut.
- [ ] Covers: `POOL_NIGHT_01_COVER.png`, `POOL_NIGHT_02_COVER.png` and `POOL_NIGHT_03_COVER.png`, 1080×1920, carrying the thumbnail lines "SOMEONE IS UNDER THE POOL" / "THE POOL IS EMPTY. SO WHO IS THAT?" / "IT FOLLOWED YOU HOME".

## Presentation
- [ ] No intro, logo, watermark, outro, "End of Night", "Subscribe" or title card.
- [ ] Frame 0 is a story image, and the first narrated sentence starts at 0.0 s.
- [ ] Each episode ends on its final scare, then a hard cut to black (no fade-out, no end card).
- [ ] No subtitles. English only. No French text or translations anywhere.
- [ ] No music. Every sound is original and procedural (licence register).
- [ ] The narration is unchanged: the words and their order match the supplied MP3, and only gain/limiting is applied.

## Picture
- [ ] There is no black or frozen gap inside an episode except the designed blackout in Night 3 (100.46–101.74 s) and the final cut.
- [ ] Each cut lands on its narration line (storyboards: `docs/STORYBOARDS.md`).
- [ ] Water reads as water: reflections, refraction (the floor seen through it), ripples, the torch shaft in the volume, drips, wet footprints, water under the door.
- [ ] The hand under the floor reads clearly as a hand pressing up from **beneath** the tiles.
- [ ] Guard: the same uniform in every shot. His hands hold the torch, radio, phone, doors, chair and steering wheel with no floating props. His feet are planted, with no sliding.
- [ ] The woman reads as the same person in every shot (white gown, long black wet hair, pale skin). She escalates from Night 1 to Night 3 and never looks like a zombie.
- [ ] CCTV feeds carry a consistent on-screen display, with the camera names matching the set's cameras.
- [ ] Phone UI: no real brands or logos.
- [ ] Each episode has one or two jump scares, delivered as clear visual events.

## Files
- [ ] Blender scenes (`blender/*.blend`), rigs (`characters.blend`), set builders and shot scripts are committed.
- [ ] Animation scene files (`blender/scenes/p1|p2|p3_animation.blend`) are committed.
- [ ] Editable edits (`studio/src/edit/P1-3.tsx`) and editable audio (cue sheets plus stems in `deliverables/`) are committed.
- [ ] Licence register, production bible, storyboards and this checklist are committed.
- [ ] The previous trilogy (`your-food-is-here/`) is untouched by this production.
