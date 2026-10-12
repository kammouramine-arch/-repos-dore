#!/usr/bin/env bash
cd "$(dirname "$0")/.."
tools/render_long.sh 600 1200 > renders/long_render2.log 2>&1 || { echo "RENDER FAILED" >> renders/finish.log; exit 1; }
rm -f renders/long_video.mp4
tools/finish.sh > renders/finish.log 2>&1 && echo FINISHED >> renders/finish.log || echo "FINISH FAILED" >> renders/finish.log
