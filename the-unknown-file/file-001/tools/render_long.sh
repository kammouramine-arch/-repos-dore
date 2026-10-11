#!/usr/bin/env bash
# Chunked, resumable 4K render of the long documentary (video only; narration is muxed later).
# Usage: tools/render_long.sh [chunk_frames]
set -euo pipefail
cd "$(dirname "$0")/../studio"
CHUNK=${1:-1200}
TOTAL=14400                      # 600 s × 24 fps
mkdir -p ../renders/long_parts
for ((s=0; s<TOTAL; s+=CHUNK)); do
  e=$(( s + CHUNK - 1 )); (( e >= TOTAL )) && e=$(( TOTAL - 1 ))
  out=$(printf "../renders/long_parts/part_%05d.mp4" "$s")
  [[ -s "$out" ]] && { echo "skip $out"; continue; }
  echo "render frames $s-$e -> $out"
  npx remotion render src/index.ts Long "$out.tmp.mp4" --frames="$s-$e" --gl=angle --muted --codec=h264 \
    --crf=17 --x264-preset=medium --pixel-format=yuv420p --concurrency=4 --log=error
  mv "$out.tmp.mp4" "$out"
done
ls ../renders/long_parts/part_*.mp4 | sed 's/^/file /' | sed "s#file ../renders/long_parts/#file #" > ../renders/long_parts/list.txt
echo done
