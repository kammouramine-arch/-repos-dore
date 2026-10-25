#!/usr/bin/env bash
# Mux one night: rendered video parts + AAC-safe mix → deliverables/YOUR_FOOD_IS_HERE_NIGHT_0N.mp4 (1080×1920, 30 fps, H.264, AAC)
# Usage: tools/finish.sh <n>   (1|2|3)
set -euo pipefail
cd "$(dirname "$0")/.."
N=$1
P=renders/n${N}_parts
OUT=deliverables/YOUR_FOOD_IS_HERE_NIGHT_0${N}.mp4
mkdir -p deliverables
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -i audio/master/n${N}_mix_aac.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 19 -maxrate 10M -bufsize 20M -pix_fmt yuv420p -r 30 -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart -shortest "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact "$OUT"
