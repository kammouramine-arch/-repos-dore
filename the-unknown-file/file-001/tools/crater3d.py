"""High-resolution crater close-up dataset (≈8.5 km square around Lake Nyos), registered to the
regional terrain's world coordinates. DEM: AWS Terrain Tiles z15. Imagery: Sentinel-2 cloudless 2016 z16."""
import json, math
import numpy as np
from PIL import Image
from scipy import ndimage
OUT = "studio/public/geo"
z = np.load("assets/geo/crater_z15.npy"); cm = json.load(open("assets/geo/crater_z15.json"))
nm = json.load(open("assets/geo/nyos_z13.json")); terr = json.load(open(f"{OUT}/nyos_terrain.json"))
bad = z < 300
z[bad] = ndimage.median_filter(np.where(bad, np.nan, z), 9)[bad] if False else np.median(z[~bad])
z = ndimage.median_filter(z, 5); z = ndimage.gaussian_filter(z, 2.2)
H, W = z.shape
cell = 40075016 * math.cos(math.radians(6.44)) / 2**15 / 256
GW = GH = 641
# imagery
s2 = np.asarray(Image.open("assets/geo/s2_crater_z16.jpg").convert("RGB"), np.float32) / 255
SH, SW = s2.shape[:2]
# lake segmentation: tan water colour (R≳G, low blue) connected to the lake centre
r, g, b = s2[..., 0], s2[..., 1], s2[..., 2]
cand = (r > g * 0.93) & (r > b * 1.25) & ((r + g + b) / 3 > 0.22)
cand = ndimage.binary_opening(cand, iterations=2)
lab, n = ndimage.label(cand)
cy, cx = int(SH * 0.53), int(SW * 0.48)
best = None
for k in range(1, n + 1):
    ys, xs = np.nonzero(lab == k)
    if len(ys) > 5000:
        d = np.hypot(ys.mean() - cy, xs.mean() - cx)
        if best is None or d < best[0]: best = (d, k, len(ys))
lake = ndimage.binary_closing(lab == best[1], iterations=6)
lake = ndimage.binary_fill_holes(lake)
lakef = ndimage.gaussian_filter(lake.astype(np.float32), 2.0)
print("lake pixels", best, "area km2", lake.sum() * (cell * W / SW) ** 2 / 1e6)
Image.fromarray((lakef * 255).astype(np.uint8)).save(f"{OUT}/crater_lake.png")
# the DEM has voids over open water: force the lake bed below the surface, then derive the mesh
lake_dem = ndimage.zoom(lake.astype(np.float32), (H / SH, W / SW), order=1) > 0.3
lake_level0 = float(np.median(z[ndimage.binary_dilation(lake_dem, iterations=3) & ~lake_dem]))
z = np.where(ndimage.binary_dilation(lake_dem, iterations=1), np.minimum(z, lake_level0 - 25), z)
z = ndimage.gaussian_filter(z, 1.0)
zs = ndimage.zoom(z, (GH / H, GW / W), order=1).astype(np.float32)
# hillshade at imagery resolution
zi = ndimage.zoom(z, (SH / H, SW / W), order=1)
ci = cell * W / SW
gy, gx = np.gradient(zi * 1.5, ci)
sl = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
def hs(az, alt):
    a, al = math.radians(az), math.radians(alt)
    return np.clip(np.sin(al) * np.cos(sl) + np.cos(al) * np.sin(sl) * np.cos(a - asp), 0, 1)
shade = 0.7 * hs(300, 38) + 0.3 * hs(150, 60)
lum = s2.mean(-1, keepdims=True)
day = lum + (s2 - lum) * 0.8
day = day * np.array([0.95, 1.0, 0.96]) * (0.4 + 0.95 * shade[..., None] ** 1.2)
day = np.clip((day - 0.03) * 1.3, 0, 1)
wat = np.array([0.06, 0.13, 0.15])
day = day * (1 - lakef[..., None]) + wat * lakef[..., None]
Image.fromarray((day * 255).astype(np.uint8)).save(f"{OUT}/crater_day.jpg", quality=92)
moon = 0.8 * hs(35, 28) + 0.2 * shade
nl = 0.12 * lum[..., 0] + 0.95 * moon ** 1.6
night = np.stack([nl * 0.40, nl * 0.55, nl * 0.80], -1) + np.array([0.008, 0.012, 0.022])
night = night * (1 - lakef[..., None]) + np.array([0.008, 0.02, 0.032]) * lakef[..., None]
Image.fromarray((np.clip(night, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/crater_night.jpg", quality=92)
zs.tofile(f"{OUT}/crater_height.bin")
# registration into regional world km
k = 2 ** (cm["zoom"] - nm["zoom"])
left = cm["x0"] * 256 / k - nm["x0"] * 256; top = cm["y0"] * 256 / k - nm["y0"] * 256
wpx = W / k; hpx = H / k
X0 = (left / terr["W"] - 0.5) * terr["width_m"] / 1000; Z0 = (top / terr["H"] - 0.5) * terr["height_m"] / 1000
X1 = ((left + wpx) / terr["W"] - 0.5) * terr["width_m"] / 1000; Z1 = ((top + hpx) / terr["H"] - 0.5) * terr["height_m"] / 1000
ys, xs = np.nonzero(lake)
lcx = X0 + (xs.mean() / SW) * (X1 - X0); lcz = Z0 + (ys.mean() / SH) * (Z1 - Z0)
lake_level = lake_level0
json.dump({"GW": GW, "GH": GH, "x0": X0, "z0": Z0, "x1": X1, "z1": Z1, "lake_x": lcx, "lake_z": lcz, "lake_level": lake_level,
           "zmin": float(zs.min()), "zmax": float(zs.max())}, open(f"{OUT}/crater_terrain.json", "w"), indent=1)
print("crater world", X0, Z0, X1, Z1, "lake", lcx, lcz, "level", lake_level, zs.min(), zs.max())
