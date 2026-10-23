#!/bin/sh
# re-render the Night 2 chunks that changed, after the kitchen plates are re-rendered
cd "$(dirname "$0")/.."
until grep -q KITCHEN_DONE blender/render_kitchen.log; do sleep 15; done
python3 tools/prep_plates.py
bash tools/render.sh Night2 3495 $(pwd)/renders/n2_parts 600 16
# then Nights 1 and 3, except the chunks that contain the Cycles animations (rendered once those exist)
SKIP="0" bash tools/render.sh Night1 3088 $(pwd)/renders/n1_parts 600 16
SKIP="2400" bash tools/render.sh Night3 3606 $(pwd)/renders/n3_parts 600 16
echo ALL_FIRST_PASS_DONE
