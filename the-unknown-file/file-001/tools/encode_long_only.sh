#!/usr/bin/env bash
# Re-encode only the long master (GitHub LFS caps files at 2 GiB → 25 Mbps average ≈ 1.9 GB).
cd "$(dirname "$0")/.."
mv renders/short_clean_video.done.mp4 renders/short_clean_video.done.mp4 2>/dev/null
tools/finish.sh > renders/finish2.log 2>&1 && echo FINISHED >> renders/finish2.log || echo "FINISH FAILED" >> renders/finish2.log
