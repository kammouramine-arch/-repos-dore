"""Download AWS Terrain Tiles (terrarium) for a bbox and mosaic to a float32 .npy + meta json.
Usage: python3 tools/fetch_dem.py name zoom lat_min lat_max lon_min lon_max"""
import io, json, math, sys, os, urllib.request
import numpy as np
from PIL import Image
name, z = sys.argv[1], int(sys.argv[2]); la0, la1, lo0, lo1 = map(float, sys.argv[3:7])
def tx(lon): return (lon + 180) / 360 * 2**z
def ty(lat):
    r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**z
x0, x1 = int(tx(lo0)), int(tx(lo1)); y0, y1 = int(ty(la1)), int(ty(la0))
W, H = (x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256
out = np.zeros((H, W), np.float32)
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        p = f"assets/geo/tiles/{z}_{x}_{y}.png"
        if not os.path.exists(p):
            urllib.request.urlretrieve(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", p)
        a = np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
        out[(y-y0)*256:(y-y0+1)*256, (x-x0)*256:(x-x0+1)*256] = a[..., 0]*256 + a[..., 1] + a[..., 2]/256 - 32768
# georeference: pixel (0,0) top-left corner of tile (x0,y0)
def lon_of(px): return px / 2**z / 256 * 360 - 180 + 0  # in global pixel units
meta = {"zoom": z, "x0": x0, "y0": y0, "W": W, "H": H,
        "lon_min": x0 / 2**z * 360 - 180, "lon_max": (x1 + 1) / 2**z * 360 - 180,
        "lat_max": math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y0 / 2**z)))),
        "lat_min": math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y1 + 1) / 2**z))))}
np.save(f"assets/geo/{name}.npy", out); json.dump(meta, open(f"assets/geo/{name}.json", "w"), indent=1)
print(name, meta, out.min(), out.max())
