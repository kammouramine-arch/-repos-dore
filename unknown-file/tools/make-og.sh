#!/usr/bin/env bash
# Render the Open Graph share cards from tools/og.html.
#
#   1. serve the site:  python3 -m http.server 8899
#   2. run:             bash tools/make-og.sh /path/to/chrome
#
# Writes assets/img/og-*.png at exactly 1200x630.
#
# Why the oversized window: some headless Chrome builds paint a viewport
# shorter than the window they were given, which silently clips the bottom
# of the card. We render tall and trim back with tools/pngcrop.py, which
# is a no-op on builds that behave.
set -euo pipefail
CHROME="${1:-${CHROME:-chromium}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE:-http://localhost:8899}"
W=1200; H=630; PAD=180

render () {
  local out="$ROOT/assets/img/og-$1.png"
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --virtual-time-budget=8000 \
    --window-size=$W,$((H + PAD)) --screenshot="$out.raw.png" \
    "$BASE/tools/og.html?v=$2" >/dev/null 2>&1
  python3 "$ROOT/tools/pngcrop.py" "$out.raw.png" "$out" $W $H
  rm -f "$out.raw.png"
}

render default   default
render archive   archive
render case-001  case-001
render free      free

# Square app icons, same trick.
icon () {
  local out="$ROOT/assets/img/$1"
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --virtual-time-budget=4000 \
    --window-size=$2,$(($2 + PAD)) --screenshot="$out.raw.png" \
    "$BASE/tools/icon.html?s=$2" >/dev/null 2>&1
  python3 "$ROOT/tools/pngcrop.py" "$out.raw.png" "$out" "$2" "$2"
  rm -f "$out.raw.png"
}

icon apple-touch-icon.png 180
icon icon-192.png 192
icon icon-512.png 512

echo "done." 
