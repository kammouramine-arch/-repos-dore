#!/usr/bin/env bash
# Mux mastered narration (+ soft EN/FR subtitles) onto rendered picture. No music, no SFX.
set -euo pipefail
cd "$(dirname "$0")/.."
D=deliverables
# SHORT (French subtitles are burned in; SRTs also attached as soft tracks)
if [[ -s renders/short_video.mp4 ]]; then
  ffmpeg -y -v error -i renders/short_video.mp4 -i audio/master/NARRATION_SHORT.wav -i data/short.fr.srt -i data/short.en.srt \
    -map 0:v -map 1:a -map 2 -map 3 -c:v copy -c:a aac -b:a 320k -ar 48000 -af apad -shortest \
    -c:s mov_text -metadata:s:s:0 language=fre -metadata:s:s:0 title="Français" -metadata:s:s:1 language=eng -metadata:s:s:1 title="English" \
    -metadata:s:a:0 language=eng -metadata title="THE UNKNOWN FILE — FILE #001 (Short)" -movflags +faststart "$D/THE_UNKNOWN_FILE_001_SHORT.mp4"
  echo "short ok"
fi
if [[ -s renders/short_clean_video.mp4 ]]; then
  ffmpeg -y -v error -i renders/short_clean_video.mp4 -i audio/master/NARRATION_SHORT.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -af apad -shortest \
    -metadata:s:a:0 language=eng -movflags +faststart "$D/THE_UNKNOWN_FILE_001_SHORT_CLEAN.mp4"
  echo "short clean ok"
fi
# LONG
if [[ -s renders/long_parts/list.txt ]]; then
  ffmpeg -y -v error -f concat -safe 0 -i renders/long_parts/list.txt -c copy renders/long_video.mp4
  ffmpeg -y -v error -i renders/long_video.mp4 -i audio/master/NARRATION_LONG.wav -i data/long.fr.srt -i data/long.en.srt \
    -map 0:v -map 1:a -map 2 -map 3 -c:v copy -c:a aac -b:a 320k -ar 48000 -af apad -shortest \
    -c:s mov_text -metadata:s:s:0 language=fre -metadata:s:s:0 title="Français" -metadata:s:s:1 language=eng -metadata:s:s:1 title="English" \
    -metadata:s:a:0 language=eng -metadata title="THE UNKNOWN FILE — FILE #001" -movflags +faststart "$D/THE_UNKNOWN_FILE_001_YOUTUBE_FULL.mp4"
  echo "long ok"
fi
# separate narration tracks (mastered, 48 kHz / 24-bit)
cp audio/master/NARRATION_SHORT.wav "$D/THE_UNKNOWN_FILE_001_SHORT_NARRATION.wav"
cp audio/master/NARRATION_LONG.wav "$D/THE_UNKNOWN_FILE_001_YOUTUBE_FULL_NARRATION.wav"
