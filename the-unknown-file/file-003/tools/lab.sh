#!/usr/bin/env bash
# QC stills -> one contact sheet. Usage: tools/lab.sh <Comp> <secs,...> [scale] [cols] [outname]
set -uo pipefail
cd "$(dirname "$0")/../studio"
OUT=/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/f3/lab
mkdir -p "$OUT" && find "$OUT" -maxdepth 1 -name '*.jpg' ! -name 'S_*' -delete
node stills.mjs "$1" "$OUT" "$2" "${3:-0.5}" 2>&1 | grep -v -i "memory" | grep -i "error\|fail" | head -5
python3 - "$OUT" "${4:-2}" "${5:-sheet}" <<'PY'
import sys, glob
from PIL import Image
d, cols, name = sys.argv[1], int(sys.argv[2]), sys.argv[3]
fs = sorted(f for f in glob.glob(d + "/*.jpg") if not f.endswith("sheet.jpg") and "/S_" not in f)
ims = [Image.open(f) for f in fs]
w, h = ims[0].size; R = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (w * cols, h * R))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(f"{d}/S_{name}.jpg", quality=88); print(f"{d}/S_{name}.jpg", len(ims))
PY
