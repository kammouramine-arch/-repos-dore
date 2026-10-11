"""Render stylized relief layers + CO2 arrival-time field from the DEM mosaics.
Outputs go to studio/public/geo. Everything is derived from AWS Terrain Tiles (SRTM et al.)
and OpenStreetMap outlines; no third-party imagery."""
import json, math
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

OUT = "studio/public/geo"
def hexrgb(h): return np.array([int(h[i:i+2], 16) for i in (1, 3, 5)], np.float32) / 255

def hillshade(z, cell, az=315, alt=38, exag=1.6):
    gy, gx = np.gradient(z * exag, cell)
    slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
    a, al = math.radians(az), math.radians(alt)
    hs = np.sin(al) * np.cos(slope) + np.cos(al) * np.sin(slope) * np.cos(a - aspect)
    return np.clip(hs, 0, 1)

def relief(z, cell, name, lo, hi, palette, exag=1.6, glow=0.0):
    hs = hillshade(z, cell, exag=exag)
    hs2 = hillshade(z, cell, az=200, alt=60, exag=exag)
    h = np.clip((z - lo) / (hi - lo), 0, 1)
    shade = 0.75 * hs + 0.25 * hs2
    c0, c1, c2 = (hexrgb(p) for p in palette)
    base = c0[None, None] * (1 - h[..., None]) + c1[None, None] * h[..., None]
    col = base * (0.35 + 0.95 * shade[..., None]) + c2[None, None] * (shade[..., None] ** 6) * 0.35
    col = np.clip(col, 0, 1)
    Image.fromarray((col * 255).astype(np.uint8)).save(f"{OUT}/{name}.jpg", quality=93)
    return hs

def contours(z, name, step, color=(236, 230, 218), alpha=70, every=5, blur=0.6):
    zz = ndimage.gaussian_filter(z, 1.2)
    b = np.floor(zz / step)
    edge = (b != np.roll(b, 1, 0)) | (b != np.roll(b, 1, 1))
    major = edge & ((b % every) == 0)
    a = np.where(major, alpha * 2.2, np.where(edge, alpha, 0)).astype(np.float32)
    a = ndimage.gaussian_filter(a, blur) * 1.6
    rgba = np.zeros(z.shape + (4,), np.uint8); rgba[..., :3] = color; rgba[..., 3] = np.clip(a, 0, 255)
    Image.fromarray(rgba).save(f"{OUT}/{name}.png")

def lonlat_to_px(meta, lon, lat):
    z = meta["zoom"]
    gx = (lon + 180) / 360 * 2**z * 256
    r = math.radians(lat)
    gy = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**z * 256
    return gx - meta["x0"] * 256, gy - meta["y0"] * 256

def polygon_px(meta, path):
    g = json.load(open(path))[0]["geojson"]
    ring = g["coordinates"][0] if g["type"] == "Polygon" else max((p[0] for p in g["coordinates"]), key=len)
    return [lonlat_to_px(meta, lo, la) for lo, la in ring]

# ---------------- local (Lake Nyos) ----------------
z = np.load("assets/geo/nyos_z13.npy"); meta = json.load(open("assets/geo/nyos_z13.json"))
cell = 40075016 * math.cos(math.radians(6.45)) / 2**meta["zoom"] / 256  # metres / px
z = ndimage.median_filter(z, 3)
relief(z, cell, "nyos_relief_night", 500, 2100, ("#0a0f16", "#3b4b5e", "#c9d3dc"), exag=1.8)
relief(z, cell, "nyos_relief_dusk", 500, 2100, ("#141210", "#5a5146", "#efe2c8"), exag=1.8)
contours(z, "nyos_contours", 40, alpha=55)
lake = polygon_px(meta, "assets/geo/osm_Lake_Nyos.json")
villages = {k: lonlat_to_px(meta, lo, la) for k, (la, lo) in {
    "Cha": (6.47797, 10.2291), "Subum": (6.51041, 10.3610), "Fang": (6.54922, 10.2801),
    "Mashi": (6.60074, 10.2670), "Wum": (6.38779, 10.0766)}.items()}

# CO2 arrival-time field: dense gas spreading from the lake, flowing preferentially downhill.
s = 2
zs = ndimage.zoom(ndimage.gaussian_filter(z, 2), 1 / s, order=1); H, W = zs.shape
from matplotlib.path import Path as MPath
lake_s = np.array(lake) / s
yy, xx = np.mgrid[0:H, 0:W]
inlake = MPath(lake_s).contains_points(np.c_[xx.ravel(), yy.ravel()]).reshape(H, W)
lake_level = float(np.median(zs[inlake]))
idx = np.arange(H * W).reshape(H, W)
rows, cols, wts = [], [], []
for dy, dx in [(0, 1), (1, 0), (1, 1), (1, -1)]:
    a = idx[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
    b = idx[max(0, dy):, max(0, dx):][:a.shape[0], :a.shape[1]] if dx >= 0 else idx[dy:, :W + dx][:a.shape[0], :a.shape[1]]
    if dx < 0: a = idx[0:H - dy, -dx:W]; b = idx[dy:H, 0:W + dx]
    za, zb = zs.ravel()[a.ravel()], zs.ravel()[b.ravel()]
    d = math.hypot(dx, dy) * cell * s
    for (u, v, zu, zv) in ((a.ravel(), b.ravel(), za, zb), (b.ravel(), a.ravel(), zb, za)):
        dz = zv - zu  # >0 uphill
        # heavy gas: cheap downhill, expensive uphill, impossible above ~lake level + 60 m
        w = d * np.where(dz > 0, 1 + 0.9 * dz, np.maximum(0.25, 1 + dz / d * 3))
        w = np.where(zv > lake_level + 60, 1e9, w)
        rows.append(u); cols.append(v); wts.append(w)
G = coo_matrix((np.concatenate(wts), (np.concatenate(rows), np.concatenate(cols))), shape=(H * W, H * W)).tocsr()
src = idx[inlake]
dist = dijkstra(G, directed=True, indices=src, min_only=True, limit=200000).reshape(H, W)
dist[~np.isfinite(dist)] = np.inf
# normalise: 0 at lake → 1 at ~22 km of "gas travel cost"
T = np.clip(dist / 38000.0, 0, 1)
T[~np.isfinite(dist)] = 1
# thickness: gas pools in low ground — weight by depth below lake level
depth = np.clip((lake_level + 60 - zs) / 500, 0, 1)
T = ndimage.zoom(T, s, order=1)[:z.shape[0], :z.shape[1]]
depth = ndimage.zoom(depth, s, order=1)[:z.shape[0], :z.shape[1]]
reach = (T < 0.999).astype(np.float32)
# encode arrival (R channel, 0=early) and density (G) for the compositor
arr = np.zeros(z.shape + (4,), np.uint8)
arr[..., 0] = (T * 255).astype(np.uint8)
arr[..., 1] = (ndimage.gaussian_filter(depth * reach, 3) * 255).astype(np.uint8)
arr[..., 3] = 255
Image.fromarray(arr).save(f"{OUT}/nyos_gas_field.png")
# packed field for the SVG compositor: R = arrival luminance (white = early), A = density.
# Density favours valley floors (terrain lower than its surroundings) and thins with distance.
zf = ndimage.gaussian_filter(z, 2)
valley = np.clip((ndimage.gaussian_filter(zf, 45) - zf) / 90.0 + 0.15, 0, 1) ** 0.9
dens = reach * (0.18 + 0.82 * valley) * (1 - 0.55 * T)
dens *= np.clip((lake_level + 40 - zf) / 120.0, 0, 1)  # cannot pile far above the source
lum = np.where(reach > 0, 1 - T, 0)
pk = np.zeros(z.shape + (4,), np.uint8)
pk[..., 0] = (ndimage.gaussian_filter(lum, 2) * 255).astype(np.uint8)
pk[..., 3] = (np.clip(ndimage.gaussian_filter(dens, 2.5), 0, 1) * 255).astype(np.uint8)
Image.fromarray(pk).save(f"{OUT}/nyos_gas_packed.png")
for k, (px, py) in villages.items():
    iy, ix = int(py), int(px)
    if 0 <= iy < T.shape[0] and 0 <= ix < T.shape[1]:
        print(f"village {k}: arrival={T[iy, ix]:.2f} elev={z[iy, ix]:.0f}")
print("lake level", lake_level)
json.dump({"meta": meta, "cell_m": cell, "lake": lake, "villages": villages, "lake_level": lake_level},
          open(f"{OUT}/nyos_meta.json", "w"))

# ---------------- regional (Nyos + Monoun) ----------------
zr = np.load("assets/geo/region_z10.npy"); mr = json.load(open("assets/geo/region_z10.json"))
cellr = 40075016 * math.cos(math.radians(6)) / 2**mr["zoom"] / 256
zr = np.maximum(zr, 0)
relief(zr, cellr, "region_relief_night", 0, 2800, ("#090d13", "#36475a", "#c9d3dc"), exag=2.2)
contours(zr, "region_contours", 200, alpha=40, every=5)
places = {"Lake Nyos": (6.43787, 10.2981), "Lake Monoun": (5.57909, 10.5852), "Bamenda": (5.96141, 10.1516),
          "Wum": (6.38779, 10.0766), "Kumbo": (6.21088, 10.6867), "Foumban": (5.7266, 10.8986)}
json.dump({"meta": mr, "places": {k: lonlat_to_px(mr, lo, la) for k, (la, lo) in places.items()},
           "nyos": polygon_px(mr, "assets/geo/osm_Lake_Nyos.json"),
           "monoun": polygon_px(mr, "assets/geo/osm_Lac_Monoun.json"),
           "nw_region": polygon_px(mr, "assets/geo/osm_Northwest_Region__Cameroon.json")},
          open(f"{OUT}/region_meta.json", "w"))
print("done")
