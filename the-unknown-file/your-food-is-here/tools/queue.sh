#!/bin/bash
# wait for the Night 1 render (pid $1), then render Night 2 and Night 3 (photos -> UI textures -> shots)
cd "$(dirname "$0")/.."
while kill -0 "$1" 2>/dev/null; do sleep 20; done
tools/render_ep.sh n2 "photo_d photo_e photo_f" "n2_lock n2_call n2_photo_ui" > renders/n2_render.log 2>&1
tools/render_ep.sh n3 "photo_n3" "n3_lock n3_final n3_final_not n3_canceled" > renders/n3_render.log 2>&1
echo QUEUE_DONE >> renders/n3_render.log
