#!/usr/bin/env bash
cd "$(dirname "$0")/.."
tools/render_long.sh 1200 > renders/long_render.log 2>&1
cd studio && npx remotion render src/index.ts ShortClean ../renders/short_clean_video.mp4 --gl=angle --muted --codec=h264 --crf=14 --pixel-format=yuv420p --log=error > ../renders/short_clean.log 2>&1
