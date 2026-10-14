"""Pre-rendered soft-edged colour fields (French colonial influence) → studio/public/fields/*.png + bounds in geo-fields.json"""
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
geo = json.load(open("studio/src/data/geo.json"))
import re
def polys(d):
    out = []
    for part in re.findall(r"M([^MZ]+)Z?", d):
        pts = [tuple(map(float, p.split(","))) for p in part.split("L")]
        out.append(pts)
    return out
P = polys(geo["detail"]["SEN"]["d"])
G = polys(geo["detail"]["GMB"]["d"])
xs = [x for p in P for x, _ in p]; ys = [y for p in P for _, y in p]
pad = 6000
x0, y0, x1, y1 = min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad
N = 1400
sc = N / (x1 - x0)
Wp, Hp = N, int((y1 - y0) * sc)
meta = {}
for name, sigma, cut in [("fra_soft", 60, False), ("fra_firm", 10, True)]:
    im = Image.new("L", (Wp, Hp), 0)
    dr = ImageDraw.Draw(im)
    for p in P: dr.polygon([((x - x0) * sc, (y - y0) * sc) for x, y in p], fill=255)
    a = ndimage.gaussian_filter(np.asarray(im).astype(float), sigma)
    if cut:  # crisp along the 1889 line: keep the Gambia corridor clear
        g = Image.new("L", (Wp, Hp), 0); gd = ImageDraw.Draw(g)
        for p in G: gd.polygon([((x - x0) * sc, (y - y0) * sc) for x, y in p], fill=255)
        a = np.where(np.asarray(g) > 0, 0, np.maximum(a, ndimage.binary_dilation(np.asarray(g) > 0, iterations=3) * 200))
    rgba = np.zeros((Hp, Wp, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = 74, 118, 192
    rgba[..., 3] = np.clip(a, 0, 255).astype(np.uint8)
    Image.fromarray(rgba).save(f"studio/public/fields/{name}.png", optimize=True)
    meta[name] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}
json.dump(meta, open("studio/src/data/fields.json", "w"), indent=1)
print(meta, Wp, Hp)
