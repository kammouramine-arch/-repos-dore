#!/usr/bin/env bash
# Chunked, resumable, auto-retrying 4K render of the long documentary (video only; narration muxed later).
# Usage: tools/render_long.sh [chunk_frames]
set -uo pipefail
cd "$(dirname "$0")/../studio"
CHUNK=${1:-600}
TOTAL=14400                      # 600 s × 24 fps
mkdir -p ../renders/long_parts
START=${2:-0}
for ((s=START; s<TOTAL; s+=CHUNK)); do
  e=$(( s + CHUNK - 1 )); (( e >= TOTAL )) && e=$(( TOTAL - 1 ))
  out=$(printf "../renders/long_parts/part_%05d.mp4" "$s")
  [[ -s "$out" ]] && { echo "skip $out"; continue; }
  for attempt in 1 2 3; do
    echo "$(date +%H:%M:%S) render frames $s-$e (attempt $attempt) -> $out"
    if npx remotion render src/index.ts Long "$out.tmp.mp4" --frames="$s-$e" --gl=angle --muted --codec=h264 \
        --crf=17 --x264-preset=medium --pixel-format=yuv420p --concurrency=4 --timeout=240000 --log=error; then
      mv "$out.tmp.mp4" "$out"; break
    fi
    rm -f "$out.tmp.mp4"
    (( attempt == 3 )) && { echo "FAILED chunk $s"; exit 1; }
  done
done
ls ../renders/long_parts/part_*.mp4 | sort | sed "s#../renders/long_parts/#file #" > ../renders/long_parts/list.txt
echo "$(date +%H:%M:%S) done"
