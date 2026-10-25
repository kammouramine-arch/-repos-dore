#!/bin/bash
# Re-render Night 2's three formerly region-only shots full-frame, then Night 3, then the POOL trilogy's shots.
cd "$(dirname "$0")/.."
export EGL_PLATFORM=surfaceless
BL=/opt/blender-dl/blender-4.2.3-linux-x64/blender
(cd blender && $BL -b --python n2_shots.py -- n2_05 n2_14 n2_15 2>&1 | grep -E "frame [0-9]+/|Error|Traceback") > renders/n2_fix.log 2>&1
echo "N2_FIX_DONE" >> renders/n2_fix.log
tools/render_ep.sh n3 "" "" > renders/n3_render.log 2>&1
echo QUEUE_DONE >> renders/n3_render.log
../someone-in-the-pool/tools/render_all.sh
