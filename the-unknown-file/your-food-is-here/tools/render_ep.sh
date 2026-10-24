#!/bin/bash
# Full render of one episode's Blender material: photos -> UI textures -> all 3D shots.
# usage: tools/render_ep.sh n1 "photo_a photo_b photo_c" "n1_delivered n1_lost n1_new_photo" [shots...]
set -e
EP=$1; PHOTOS=$2; UIS=$3; shift 3
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BL=/opt/blender-dl/blender-4.2.3-linux-x64/blender
export EGL_PLATFORM=surfaceless
cd "$ROOT/blender"
if [ -n "$PHOTOS" ]; then $BL -b --python ${EP}_shots.py -- $PHOTOS 2>&1 | grep -E "Saved|Error|Traceback" || true; fi
mkdir -p "$ROOT/studio/public/photos"
for p in $PHOTOS; do cp "$ROOT/renders/$EP/$p.jpg" "$ROOT/studio/public/photos/${EP}_$p.jpg"; done
if [ -n "$UIS" ]; then (cd "$ROOT/studio" && node uistills.mjs $UIS 2>&1 | grep -E "^ui|Error" || true); fi
$BL -b --python ${EP}_shots.py -- ${@:-all} 2>&1 | grep -E "frame [0-9]+/|Error|Traceback|skip" || true
echo "RENDER_EP_DONE $EP"
