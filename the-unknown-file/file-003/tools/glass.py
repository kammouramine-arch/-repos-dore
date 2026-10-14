"""Make the windscreen/side window of the truck-interior photo transparent (keeps the steering wheel/dash).
Usage: python3 tools/glass.py src out.png"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
im = Image.open(sys.argv[1]).convert("RGB"); W, H = im.size; k = W / 1536
poly1 = [(40, 0), (905, 0), (905, 55), (1010, 105), (1160, 150), (1215, 182), (1050, 425), (1040, 468), (600, 470), (0, 520), (0, 40)]
poly2 = [(1085, 465), (1255, 190), (1536, 140), (1536, 475)]
m = Image.new("L", im.size, 0); d = ImageDraw.Draw(m)
for p in (poly1, poly2): d.polygon([(x * k, y * k) for x, y in p], fill=255)
inside = np.asarray(m) > 0
a = np.asarray(im).astype(np.float32) / 255
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
teal = (g > r + 0.06) & (g >= b - 0.03) & (lum > 0.45)   # pale-green steering wheel spokes
dark = lum < 0.16                                          # wheel rim / pillars
keep_obj = teal | dark
keep_obj = ndimage.binary_opening(keep_obj, iterations=1)
lab, n = ndimage.label(keep_obj)
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
outside_ids = set(np.unique(lab[~inside])) - {0}
big = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 4000 and (i + 1) in outside_ids])   # wheel/pillars reach below the glass; horizon specks don't
glass = inside & ~big
alpha = np.where(glass, 0, 255).astype(np.uint8)
im.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2)))
im.save(sys.argv[2]); print(sys.argv[2], im.size)
