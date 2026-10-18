#!/usr/bin/env bash
# waits for the 4K render, then muxes the final film with the AAC-safe mix
cd "$(dirname "$0")/.."
until grep -q "RENDER DONE\|FAILED" renders/long_render.log; do sleep 30; done
grep -q FAILED renders/long_render.log && { echo "RENDER FAILED"; exit 1; }
cd renders/long_parts
echo "encode start $(date +%H:%M:%S)"
ffmpeg -v error -y -f concat -safe 0 -i list.txt -i ../../audio/master/long_mix_aac.wav -map 0:v -map 1:a -c:v libx264 -preset medium -crf 18 -maxrate 21M -bufsize 42M -pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest ../long_encoding.mp4 \
 && echo "ENCODE DONE $(date +%H:%M:%S)"
