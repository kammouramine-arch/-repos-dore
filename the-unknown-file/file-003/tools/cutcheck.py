"""Grid preview of alpha cut-outs over magenta. Usage: python3 tools/cutcheck.py out.jpg a.png b.png ..."""
import sys
from PIL import Image
out, fs = sys.argv[1], sys.argv[2:]
tiles = []
for f in fs:
    im = Image.open(f).convert("RGBA"); im.thumbnail((640, 480))
    bg = Image.new("RGBA", im.size, (200, 0, 160, 255)); bg.alpha_composite(im); tiles.append(bg.convert("RGB"))
cols = 4; R = (len(tiles) + cols - 1) // cols
S = Image.new("RGB", (cols * 640, R * 480), (20, 20, 20))
for i, t in enumerate(tiles): S.paste(t, ((i % cols) * 640, (i // cols) * 480))
S.save(out, quality=85)
