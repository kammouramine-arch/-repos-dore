#!/usr/bin/env bash
# Cut + transcode source footage into studio/public/footage (H.264, short GOP for frame-accurate seeking).
# Sources (see deliverables/LICENSE_REGISTER.md): archive.org items, downloaded to $RAW.
set -euo pipefail
RAW=${RAW:-raw}; OUT=studio/public/footage; mkdir -p "$OUT"
cut() { # name src start dur [vf]
  local vf=${5:-"null"}
  ffmpeg -v error -y -ss "$3" -t "$4" -i "$RAW/$2" -an -vf "yadif=deint=interlaced,$vf,format=yuv420p" \
    -c:v libx264 -crf 17 -preset slow -g 12 -movflags +faststart "$OUT/$1.mp4"
  echo "$1 $(ffprobe -v error -select_streams v -show_entries stream=width,height,nb_frames -of csv=p=0 "$OUT/$1.mp4")"
}
# The Shenandoah National Park (1936), U.S. Dept. of the Interior / NPS / Bureau of Mines — National Archives 12482 (public domain)
cut arch_va_map        shen1936.mp4 42   32
cut arch_entrance      shen1936.mp4 113  7
cut arch_skyline_clouds shen1936.mp4 124 7
cut arch_tunnel        shen1936.mp4 131  11
cut arch_road_curve    shen1936.mp4 142  11
cut arch_overlook      shen1936.mp4 153  13
cut arch_road2         shen1936.mp4 186  6
cut arch_swiftrun      shen1936.mp4 531  8
cut arch_trees         shen1936.mp4 550  19
cut arch_valley        shen1936.mp4 570  5
cut arch_ccc_flag      shen1936.mp4 595  18
# Story of a Forest Ranger (1954), U.S. Department of Agriculture — Prelinger Archives (US government work, public domain)
cut usfs_lookout       ranger1954.mp4 1176 8
cut usfs_lookout2      ranger1954.mp4 1189 8
cut usfs_trucks        ranger1954.mp4 1218 34
cut usfs_fire          ranger1954.mp4 1262 28
# Lightning (Beachfront Productions, Jeffrey Beach) — CC BY 3.0
cut bf_lightning       beachfront_lightning.mp4 0 46
# Approaching Thunderstorm (C. E. Price, SW Virginia) + CEP280/281 — public domain dedication
cut price_timelapse    price_approach.mpg 0 48
cut cep_bolt1          cep280.mpg 0 10
cut cep_bolt2          cep281.mpg 0 6
# thunderstorm (the carport theatre) — CC BY 4.0
cut carport_window     carport_thunder.mp4 0 40
