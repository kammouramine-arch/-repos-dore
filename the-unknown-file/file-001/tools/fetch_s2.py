"""Mosaic EOX Sentinel-2 cloudless 2016 (CC BY 4.0) tiles to exactly the DEM footprint.
Attribution: Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH
(Contains modified Copernicus Sentinel data 2016)."""
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
name, z = sys.argv[1], int(sys.argv[2]); meta = json.load(open(f"assets/geo/{sys.argv[3]}.json"))
k = 2 ** (z - meta["zoom"])
x0, y0 = meta["x0"] * k, meta["y0"] * k
nx, ny = meta["W"] // 256 * k, meta["H"] // 256 * k
os.makedirs("assets/geo/s2", exist_ok=True)
def get(xy):
    x, y = xy; p = f"assets/geo/s2/{z}_{x}_{y}.jpg"
    if not os.path.exists(p):
        req = urllib.request.Request(f"https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg",
                                     headers={"User-Agent": "TheUnknownFile/1.0"})
        open(p, "wb").write(urllib.request.urlopen(req, timeout=60).read())
    return p
tiles = [(x, y) for x in range(x0, x0 + nx) for y in range(y0, y0 + ny)]
with ThreadPoolExecutor(6) as ex: paths = list(ex.map(get, tiles))
img = Image.new("RGB", (nx * 256, ny * 256))
for (x, y), p in zip(tiles, paths): img.paste(Image.open(p).convert("RGB"), ((x - x0) * 256, (y - y0) * 256))
img.save(f"assets/geo/{name}.jpg", quality=92); print(name, img.size, len(tiles))
