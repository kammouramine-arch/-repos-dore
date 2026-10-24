#!/usr/bin/env bash
# Render every 3D/CCTV shot of the three nights (feeds first, then shots; finished shots are skipped, so it is resumable).
# Usage: tools/render_all.sh [wait_pid]   — waits for another render (e.g. the previous trilogy's queue) to finish first.
cd "$(dirname "$0")/.."
if [[ -n "${1:-}" ]]; then while kill -0 "$1" 2>/dev/null; do sleep 30; done; fi
for ep in p1 p2 p3; do
  (cd blender && EGL_PLATFORM=surfaceless /opt/blender-dl/blender-4.2.3-linux-x64/blender -b --python ${ep}_shots.py -- all) > renders/${ep}_render.log 2>&1
  echo "RENDER_EP_DONE $ep $(date +%H:%M)" >> renders/${ep}_render.log
done
echo "POOL_RENDER_DONE $(date +%H:%M)" >> renders/p3_render.log
