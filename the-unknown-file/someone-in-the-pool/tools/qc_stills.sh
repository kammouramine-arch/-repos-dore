#!/usr/bin/env bash
# QC stills (75% res, 3 per shot: start / middle / end) -> renders/<ep>/_stills/. Usage: tools/qc_stills.sh <wait_pid|0> <ep> <shots...>
cd "$(dirname "$0")/../blender"
W=$1; EP=$2; shift 2
if [[ "$W" != "0" ]]; then while kill -0 "$W" 2>/dev/null; do sleep 20; done; fi
EGL_PLATFORM=surfaceless nice -n 5 /opt/blender-dl/blender-4.2.3-linux-x64/blender -b --python ${EP}_shots.py -- "$@" --still > ../renders/${EP}_stills_$(date +%H%M).log 2>&1
echo "QC_DONE $EP"
