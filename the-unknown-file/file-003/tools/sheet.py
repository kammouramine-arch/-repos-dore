"""Contact sheet from a flickr_search.py listing (stdin) -> sheet jpg with ids.  Usage: ... | python3 tools/sheet.py out.jpg [cols]"""
import sys, subprocess, io
from PIL import Image, ImageDraw
out = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 5
rows = [l.split(" | ") for l in sys.stdin if " | " in l]
tw, th = 360, 250
imgs = []
for r in rows:
    url = r[3].strip().replace("_b.jpg", "_n.jpg").replace("_z.jpg", "_n.jpg").replace("_c.jpg", "_n.jpg")
    data = subprocess.run(["curl", "-sSL", "-A", "Mozilla/5.0", url], capture_output=True).stdout
    try: im = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception: im = Image.new("RGB", (tw, th), (60, 0, 0))
    im.thumbnail((tw, th - 22)); imgs.append((r[0].strip(), r[1].strip()[:40], im))
n = len(imgs); R = (n + cols - 1) // cols
S = Image.new("RGB", (cols * tw, R * th), (20, 20, 20)); d = ImageDraw.Draw(S)
for i, (pid, title, im) in enumerate(imgs):
    x, y = (i % cols) * tw, (i // cols) * th
    S.paste(im, (x + (tw - im.width) // 2, y)); d.text((x + 4, y + th - 20), f"{pid} {title}", fill=(255, 255, 160))
S.save(out, quality=85)
