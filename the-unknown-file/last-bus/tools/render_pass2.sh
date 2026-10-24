#!/bin/sh
# second pass: re-render the chunks touched by the review fixes
cd "$(dirname "$0")/.."
until grep -q FIXDONE renders/n1_fix.log; do sleep 15; done
rm -f renders/n2_parts/part_00600.mp4 renders/n3_parts/part_00000.mp4 renders/n3_parts/part_01200.mp4 renders/n3_parts/part_01800.mp4 renders/n1_parts/part_02400.mp4
bash tools/render.sh Night1 3088 $(pwd)/renders/n1_parts 600 16
bash tools/render.sh Night2 3495 $(pwd)/renders/n2_parts 600 16
bash tools/render.sh Night3 3606 $(pwd)/renders/n3_parts 600 16
echo PASS2_DONE
