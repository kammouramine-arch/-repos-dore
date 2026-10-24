"""Protagonist T-shirt: MPFB male_casualsuit02 (CC0) atlas with the logo + orange trims removed, recoloured heather charcoal."""
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB"); W, H = im.size
a = np.asarray(im).astype(np.float32) / 255
# patch the chest logo with plain fabric from lower on the same panel
cy, cx, r = int(0.164 * H), int(0.558 * W), int(0.068 * W)
dy = int(0.13 * H)
a[cy - r:cy + r, cx - r:cx + r] = a[cy - r + dy:cy + r + dy, cx - r:cx + r]
L = a.mean(2)
Lm = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9))).astype(np.float32) / 255
blur = np.asarray(Image.fromarray((Lm * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))).astype(np.float32) / 255
det = np.clip(Lm - blur, -0.06, 0.06)
rng = np.random.default_rng(3)
heather = rng.normal(0, 0.012, (H, W)).astype(np.float32)
base = np.array([0.205, 0.21, 0.225], np.float32)
new = np.clip(base[None, None, :] * (1 + 3.0 * det + heather)[..., None], 0, 1)
yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
mask = (yy < 0.415) | (xx > 0.725)
out = np.where(mask[..., None], new, a)
Image.fromarray((out * 255).astype(np.uint8)).save(dst)
