#!/usr/bin/env bash
# Chunked, resumable, auto-retrying render (video only; the narration + SFX mix is muxed afterwards).
# Usage: tools/render.sh <Composition> <total_frames> <parts_dir> [chunk_frames] [crf]
set -uo pipefail
cd "$(dirname "$0")/../studio"
COMP=$1; TOTAL=$2; DIR=$3; CHUNK=${4:-600}; CRF=${5:-16}
SKIP=" ${SKIP:-} "   # optional: start frames to leave for later, e.g. SKIP="0 2400"
mkdir -p "$DIR"
for ((s=0; s<TOTAL; s+=CHUNK)); do
  e=$(( s + CHUNK - 1 )); (( e >= TOTAL )) && e=$(( TOTAL - 1 ))
  out=$(printf "%s/part_%05d.mp4" "$DIR" "$s")
  [[ -s "$out" ]] && { echo "skip $out"; continue; }
  [[ "$SKIP" == *" $s "* ]] && { echo "deferred $s"; continue; }
  for attempt in 1 2 3; do
    echo "$(date +%H:%M:%S) $COMP frames $s-$e (attempt $attempt)"
    if npx remotion render src/index.ts "$COMP" "$out.tmp.mp4" --frames="$s-$e" --gl=angle --muted --codec=h264 \
        --crf="$CRF" --x264-preset=medium --pixel-format=yuv420p --concurrency=${CONC:-4} --timeout=240000 --log=error; then
      mv "$out.tmp.mp4" "$out"; break
    fi
    rm -f "$out.tmp.mp4"
    (( attempt == 3 )) && { echo "FAILED chunk $s"; exit 1; }
  done
done
(cd "$DIR" && ls part_*.mp4 | sort | sed "s/^/file /" > list.txt)
echo "$(date +%H:%M:%S) RENDER DONE $COMP"
