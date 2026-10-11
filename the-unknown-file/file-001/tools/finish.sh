#!/usr/bin/env bash
# Mux the mastered narration onto the rendered picture. English only: no French, no burned subtitles,
# no music, no SFX. English SRTs are delivered as separate files (optional YouTube upload).
set -euo pipefail
cd "$(dirname "$0")/.."
D=deliverables
enc_short() { # $1 = picture, $2 = output
  local DUR; DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
  ffmpeg -y -v error -i "$1" -i audio/master/NARRATION_SHORT.wav -map 0:v -map 1:a -t "$DUR" \
    -c:v libx264 -preset slow -crf 18 -maxrate 16M -bufsize 32M -profile:v high -level 4.2 -pix_fmt yuv420p -x264-params "keyint=60:min-keyint=30" \
    -c:a aac -b:a 320k -ar 48000 -af "apad=whole_dur=$DUR" -metadata:s:a:0 language=eng \
    -metadata title="THE UNKNOWN FILE — FILE #001 (Short)" -movflags +faststart "$2"
}
if [[ -s renders/short_clean_video.mp4 ]]; then enc_short renders/short_clean_video.mp4 "$D/THE_UNKNOWN_FILE_001_SHORT.mp4"; echo "short ok"; fi
if [[ -s renders/long_parts/list.txt ]]; then
  ffmpeg -y -v error -f concat -safe 0 -i renders/long_parts/list.txt -c copy renders/long_video.mp4
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 renders/long_video.mp4)
  ffmpeg -y -v error -i renders/long_video.mp4 -i audio/master/NARRATION_LONG.wav -map 0:v -map 1:a -t "$DUR" \
    -c:v libx264 -preset slow -crf 18 -maxrate 40M -bufsize 80M -profile:v high -level 5.1 -pix_fmt yuv420p -x264-params "keyint=48:min-keyint=24" \
    -c:a aac -b:a 320k -ar 48000 -af "apad=whole_dur=$DUR" -metadata:s:a:0 language=eng \
    -metadata title="THE UNKNOWN FILE — FILE #001" -movflags +faststart "$D/THE_UNKNOWN_FILE_001_YOUTUBE_FULL.mp4"
  echo "long ok"
fi
cp audio/master/NARRATION_SHORT.wav "$D/THE_UNKNOWN_FILE_001_SHORT_NARRATION.wav"
cp audio/master/NARRATION_LONG.wav "$D/THE_UNKNOWN_FILE_001_YOUTUBE_FULL_NARRATION.wav"
