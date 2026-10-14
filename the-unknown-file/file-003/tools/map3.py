"""Maps for FILE #003: dark cinematic shaded relief of Virginia / the Blue Ridge + vector overlays.

Elevation: AWS Terrain Tiles (Terrarium; Mapzen/Tilezen open data — SRTM, ETOPO1, GMTED).
States: Natural Earth 1:10m admin-1 (public domain). Park: NPS Land Resources Division boundary (public domain).

Writes studio/public/map/<name>.jpg and studio/src/data/map_<name>.json:
  {w, h, z, x0, y0}  (tile-pixel origin at zoom z)  plus SVG path strings in image pixels:
  states (VA highlighted + neighbours), park, places (lon/lat -> px)
Usage: python3 tools/map3.py <name> <z> <lon0> <lat0> <lon1> <lat1> <zfactor>
"""
import io, json, math, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import shapefile
from PIL import Image
from scipy import ndimage

URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def merc(lon, lat, z):
    n = 256 * 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch(z, x, y):
    err = None
    for _ in range(5):
        try:
            data = urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60).read()
            a = np.asarray(Image.open(io.BytesIO(data)).convert("RGB")).astype(np.float64)
            return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        except Exception as e:  # noqa
            err = e
    raise err


def ramp(stops, v):
    xs = np.array([s[0] for s in stops], float)
    cs = np.array([[int(s[1][i:i + 2], 16) for i in (1, 3, 5)] for s in stops], float)
    return np.stack([np.interp(v, xs, cs[:, k]) for k in range(3)], -1)


# night-storm palette: slate lowlands, cold blue-green highlands, near-black water
LAND = [(-10, "#1b2229"), (0, "#1b2229"), (100, "#1e262c"), (300, "#232c30"), (600, "#2a3433"), (900, "#323c38"), (1300, "#3d453f"), (2000, "#4a504a")]
SEA = [(-5000, "#05080b"), (-50, "#070b0f"), (0, "#0a1015")]


def main():
    name, z = sys.argv[1], int(sys.argv[2])
    lon0, lat0, lon1, lat1, zf = map(float, sys.argv[3:8])
    px0, py0 = merc(lon0, lat1, z)
    px1, py1 = merc(lon1, lat0, z)
    tx0, ty0, tx1, ty1 = int(px0 // 256), int(py0 // 256), int(px1 // 256), int(py1 // 256)
    jobs = [(tx, ty) for ty in range(ty0, ty1 + 1) for tx in range(tx0, tx1 + 1)]
    print(name, len(jobs), "tiles", flush=True)
    with ThreadPoolExecutor(12) as ex:
        tiles = list(ex.map(lambda j: fetch(z, *j), jobs))
    W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
    elev = np.zeros((H, W))
    for (tx, ty), a in zip(jobs, tiles):
        elev[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = a
    # crop to requested box
    cx0, cy0 = int(px0 - tx0 * 256), int(py0 - ty0 * 256)
    cx1, cy1 = int(px1 - tx0 * 256), int(py1 - ty0 * 256)
    elev = elev[cy0:cy1, cx0:cx1]
    ox, oy = tx0 * 256 + cx0, ty0 * 256 + cy0
    e = ndimage.gaussian_filter(elev, 0.8)
    # metres per pixel at this latitude / zoom
    mpp = 156543.03 * math.cos(math.radians((lat0 + lat1) / 2)) / 2 ** z
    gy, gx = np.gradient(e * zf, mpp)
    def shade(az, alt):
        a, b = math.radians(az), math.radians(alt)
        slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
        return np.clip(np.sin(b) * np.cos(slope) + np.cos(b) * np.sin(slope) * np.cos(a - aspect), 0, 1)
    hs = 0.65 * shade(315, 38) + 0.35 * shade(250, 55)
    land = elev > 0.5
    col = np.where(land[..., None], ramp(LAND, elev), ramp(SEA, elev))
    lit = col * (0.35 + 1.25 * hs[..., None])
    # soft cool rim on ridges
    lit += (np.clip(hs - 0.75, 0, 1) * 60)[..., None] * np.array([0.55, 0.75, 1.0])
    img = Image.fromarray(np.clip(lit, 0, 255).astype(np.uint8))
    import os
    os.makedirs("studio/public/map", exist_ok=True)
    img.save(f"studio/public/map/{name}.jpg", quality=92)
    h, w = elev.shape

    def P(lon, lat):
        x, y = merc(lon, lat, z)
        return x - ox, y - oy

    def ring_path(ring, step=1):
        pts = [P(*c) for c in ring[::step]]
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"

    out = {"w": w, "h": h, "z": z, "ox": ox, "oy": oy, "bbox": [lon0, lat0, lon1, lat1], "states": {}}
    sf = shapefile.Reader("assets/geo/ne_admin1/ne_10m_admin_1_states_provinces")
    flds = [f[0] for f in sf.fields[1:]]
    for sr in sf.iterShapeRecords():
        rec = dict(zip(flds, sr.record))
        if rec.get("adm0_a3") != "USA" and rec.get("adm0_a3") != "CAN":
            continue
        bb = sr.shape.bbox
        if bb[2] < lon0 - 3 or bb[0] > lon1 + 3 or bb[3] < lat0 - 3 or bb[1] > lat1 + 3:
            continue
        pts, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
        d = " ".join(ring_path(pts[parts[i]:parts[i + 1]]) for i in range(len(parts) - 1) if parts[i + 1] - parts[i] > 3)
        out["states"][rec["name"]] = d
    g = json.load(open("assets/geo/shen_boundary.geojson"))
    dd = []
    for f in g["features"]:
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            if len(poly[0]) > 8:
                dd.append(ring_path(poly[0]))
    out["park"] = " ".join(dd)
    places = {"Richmond": (-77.436, 37.541), "Washington, D.C.": (-77.037, 38.907), "Front Royal": (-78.194, 38.918),
              "Luray": (-78.460, 38.665), "Charlottesville": (-78.477, 38.029), "Waynesboro": (-78.889, 38.068),
              "Big Meadows": (-78.437, 38.528), "Skyland": (-78.384, 38.594), "Old Rag": (-78.315, 38.551),
              "Swift Run Gap": (-78.548, 38.357), "Thornton Gap": (-78.322, 38.661), "Dooms": (-78.86, 38.11)}
    out["places"] = {k: [round(v, 1) for v in P(*ll)] for k, ll in places.items()}
    json.dump(out, open(f"studio/src/data/map_{name}.json", "w"))
    print(name, w, h, "states", len(out["states"]), "park parts", len(dd))


if __name__ == "__main__":
    main()
