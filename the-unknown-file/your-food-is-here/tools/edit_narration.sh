#!/usr/bin/env bash
# Clean narration edits (no words of the story removed):
#  N3: removes the spoken label "Night three," (0.00-0.82 s; silence until 1.62 s). The edit starts at 1.50 s,
#      inside the silence, so the episode opens 0.13 s before "You haven't slept." Every later cue shifts by -1.50 s.
#  N1, N2: no spoken intro/outro labels or branding were found (checked against the word transcripts) — unchanged.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio/edited
ffmpeg -v error -y -ss 1.50 -i audio/HORROR_DELIVERY_NIGHT_03.mp3 -af "afade=t=in:d=0.01" -c:a pcm_s24le -ar 48000 audio/edited/N3_narration_edit.wav
ffmpeg -v error -y -i audio/HORROR_DELIVERY_NIGHT_01.mp3 -c:a pcm_s24le -ar 48000 audio/edited/N1_narration.wav
ffmpeg -v error -y -i audio/HORROR_DELIVERY_NIGHT_02.mp3 -c:a pcm_s24le -ar 48000 audio/edited/N2_narration.wav
for f in audio/edited/*.wav; do echo "$f $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)"; done
