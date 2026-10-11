"""Bake 3D terrain assets for the Three.js scenes (studio/public/geo):
 nyos_height.bin  float32 heights (m) on a GWxGH grid, row-major north->south
 nyos_day.jpg     Sentinel-2 cloudless 2016 graded + baked hillshade
 nyos_night.jpg   moonlit grade
 nyos_lake.png    lake mask (OSM outline)"""
import json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from scipy import ndimage
OUT = "studio/public/geo"
z = np.load("assets/geo/nyos_z13.npy"); meta = json.load(open("assets/geo/nyos_z13.json"))
nm = json.load(open(f"{OUT}/nyos_meta.json"))
H, W = z.shape
z = ndimage.median_filter(z, 3); z = ndimage.gaussian_filter(z, 1.0)
GW, GH = 513, 456
zs = ndimage.zoom(z, (GH / H, GW / W), order=1).astype(np.float32)
zs.tofile(f"{OUT}/nyos_height.bin")
# lake mask in DEM pixel space
m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).polygon([tuple(p) for p in nm["lake"]], fill=255)
m = m.filter(ImageFilter.GaussianBlur(1.2)); m.save(f"{OUT}/nyos_lake.png")
lake = np.asarray(m, np.float32) / 255
# hillshade at DEM res
cell = nm["cell_m"]; gy, gx = np.gradient(z * 1.5, cell)
sl = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
def hs(az, alt):
    a, al = math.radians(az), math.radians(alt)
    return np.clip(np.sin(al) * np.cos(sl) + np.cos(al) * np.sin(sl) * np.cos(a - asp), 0, 1)
shade = 0.7 * hs(300, 35) + 0.3 * hs(160, 55)
s2 = Image.open("assets/geo/s2_nyos_z14.jpg").convert("RGB").resize((W * 2, H * 2), Image.LANCZOS)
s2a = np.asarray(s2, np.float32) / 255
sh2 = ndimage.zoom(shade, 2, order=1)[:H*2, :W*2]; lk2 = ndimage.zoom(lake, 2, order=1)[:H*2, :W*2]
# day: muted, slightly cool greens, relief emphasis; lake painted deep teal (actual 2016 tile shows a tan cast)
lum = s2a.mean(-1, keepdims=True)
day = lum + (s2a - lum) * 0.72
day = day * np.array([0.92, 1.0, 0.98]) * (0.55 + 0.75 * sh2[..., None])
day = np.clip((day - 0.02) * 1.25, 0, 1)
water = np.array([0.05, 0.11, 0.13])
day = day * (1 - lk2[..., None]) + water * lk2[..., None]
Image.fromarray((day * 255).astype(np.uint8)).resize((4096, int(4096 * H / W)), Image.LANCZOS).save(f"{OUT}/nyos_day.jpg", quality=92)
# night: moonlit blue, desaturated, strong relief contrast
moon = 0.8 * ndimage.zoom(hs(35, 28), 2, order=1)[:H*2, :W*2] + 0.2 * sh2
nl = 0.12 * lum[..., 0] + 0.95 * moon ** 1.6
night = np.stack([nl * 0.40, nl * 0.55, nl * 0.80], -1) + np.array([0.008, 0.012, 0.022])
night = night * (1 - lk2[..., None]) + np.array([0.008, 0.02, 0.032]) * lk2[..., None]
Image.fromarray((np.clip(night, 0, 1) * 255).astype(np.uint8)).resize((4096, int(4096 * H / W)), Image.LANCZOS).save(f"{OUT}/nyos_night.jpg", quality=92)
json.dump({"GW": GW, "GH": GH, "W": W, "H": H, "cell_m": cell, "width_m": W * cell, "height_m": H * cell,
           "lake_level": nm["lake_level"], "zmin": float(zs.min()), "zmax": float(zs.max())}, open(f"{OUT}/nyos_terrain.json", "w"), indent=1)
print("ok", zs.shape, zs.min(), zs.max(), W * cell, H * cell)
