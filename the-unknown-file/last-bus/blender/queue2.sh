#!/bin/sh
# second batch: waits for the first plate batch, then renders the late plates and the two Cycles animations
B=/opt/blender-dl/blender-4.2.3-linux-x64/blender
cd "$(dirname "$0")"
until grep -q PLATES_DONE render_plates.log; do sleep 20; done
$B -b --python build_sets.py -- bus_row bus_row_red bath_mirror_os bath_mirror_os_dark street_bldg_bus_red --res 1080x1920 --samples 16 > render_plates2.log 2>&1
echo PLATES2_DONE >> render_plates2.log
$B -b --python build_sets.py -- anim_arrive_station anim_depart_bldg --res 720x1280 --samples 12 > render_anims.log 2>&1
echo ANIMS_DONE >> render_anims.log
