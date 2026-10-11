#!/usr/bin/env bash
# 1) English-only short (no burned subtitles)  2) resume the chunked 4K long render
cd "$(dirname "$0")/.."
( cd studio && npx remotion render src/index.ts ShortClean ../renders/short_clean_video.mp4 --gl=angle --muted --codec=h264 --crf=14 --pixel-format=yuv420p --concurrency=4 --log=info > ../renders/short_clean.log 2>&1 )
tools/render_long.sh 1200 > renders/long_render.log 2>&1
