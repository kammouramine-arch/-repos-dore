"""Procedural textures (all original): tileable noise for shaders, film grain tiles, paper fibre."""
import numpy as np
from PIL import Image
OUT = "studio/public/tex"
rs = np.random.default_rng(1986)
def periodic(n, beta, seed):
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n); fx, fy = np.meshgrid(f, f)
    k = np.hypot(fx, fy); k[0, 0] = 1
    spec = (r.normal(size=(n, n)) + 1j * r.normal(size=(n, n))) / k ** beta
    spec[0, 0] = 0
    a = np.real(np.fft.ifft2(spec)); a = (a - a.min()) / (a.max() - a.min()); return a
def band(n, lo, hi, seed):
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n) * n; fx, fy = np.meshgrid(f, f); k = np.hypot(fx, fy)
    spec = (r.normal(size=(n, n)) + 1j * r.normal(size=(n, n))) * ((k >= lo) & (k <= hi)) / np.maximum(k, 1) ** 0.8
    a = np.real(np.fft.ifft2(spec)); a = (a - a.min()) / (a.max() - a.min()); return a
n = 512
rgba = np.stack([band(n, 2, 12, 1), band(n, 6, 40, 2), band(n, 20, 120, 3), periodic(n, 1.4, 4)], -1)
Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").save(f"{OUT}/noise.png")
# film grain tiles (gaussian, mid-grey) for overlay blending
for i in range(8):
    g = np.clip(128 + rs.normal(0, 38, (512, 512)), 0, 255).astype(np.uint8)
    Image.fromarray(g).save(f"{OUT}/grain{i}.png")
# paper: warm off-white with fibre and mottling
p = periodic(1024, 1.2, 9) * 0.6 + band(1024, 60, 400, 10) * 0.4
fib = band(1024, 150, 500, 11)
base = np.array([0.905, 0.875, 0.81])
img = base[None, None] * (0.9 + 0.12 * p[..., None]) - 0.05 * (fib[..., None] > 0.62)
Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/paper.jpg", quality=90)
# smoke/fog sprite sheet source: soft tileable wisps for 2D scenes
w = periodic(1024, 1.6, 21) ** 2.2
Image.fromarray((w / w.max() * 255).astype(np.uint8)).save(f"{OUT}/wisps.png")
print("ok")
