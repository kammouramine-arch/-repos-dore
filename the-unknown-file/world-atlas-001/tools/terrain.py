"""Shaded-relief terrain rasters for WORLD ATLAS #001 (vintage-atlas style).

Elevation: AWS Terrain Tiles (Terrarium encoding; Mapzen/Tilezen open data, sources incl. SRTM, ETOPO1, GMTED).
Each level is a block of Web-Mercator tiles at zoom z; the script writes a JPEG and a JSON sidecar with its
bounds in "world pixels" at Z_REF = 12 (the coordinate system used by the Remotion map engine).

Usage: python3 tools/terrain.py <name> <z> <lon0> <lat0> <lon1> <lat1> <zfactor>
"""
import io, json, math, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
from scipy import ndimage

Z_REF = 12
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def tile_xy(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch(z, x, y):
    for _ in range(5):
        try:
            data = urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60).read()
            a = np.asarray(Image.open(io.BytesIO(data)).convert("RGB")).astype(np.float64)
            return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        except Exception as e:  # noqa
            err = e
    raise err


def lerp_colors(stops, v):
    xs = np.array([s[0] for s in stops], float)
    cs = np.array([[int(s[1][i:i + 2], 16) for i in (1, 3, 5)] for s in stops], float)
    return np.stack([np.interp(v, xs, cs[:, k]) for k in range(3)], -1)


# vintage atlas palette: warm parchment lowlands → umber highlands; deep slate ocean
LAND = [(-50, "#b8a77f"), (0, "#b8a77f"), (60, "#b09f74"), (250, "#a48f66"), (600, "#937c5a"), (1200, "#806b52"), (2500, "#6f5f52"), (5000, "#8a8078")]
SEA = [(-8000, "#070b0f"), (-4000, "#0a1117"), (-1000, "#0f1a22"), (-200, "#15232c"), (-30, "#1c2e38"), (0, "#22363f")]


def main():
    name, z = sys.argv[1], int(sys.argv[2])
    lon0, lat0, lon1, lat1, zf = map(float, sys.argv[3:8])
    x0, y0 = tile_xy(lon0, lat1, z)
    x1, y1 = tile_xy(lon1, lat0, z)
    tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
    W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
    print(name, "tiles", (tx1 - tx0 + 1) * (ty1 - ty0 + 1), "->", W, "x", H, flush=True)
    jobs = [(tx, ty) for ty in range(ty0, ty1 + 1) for tx in range(tx0, tx1 + 1)]
    with ThreadPoolExecutor(12) as ex:
        tiles = list(ex.map(lambda j: fetch(z, *j), jobs))
    elev = np.zeros((H, W))
    for (tx, ty), a in zip(jobs, tiles):
        elev[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = a
    np.save(f"assets/terrain/{name}_elev.npy", elev.astype(np.float32))
    # ground resolution per row (m/px)
    lat_rows = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (ty0 + (np.arange(H) + 0.5) / 256) / 2 ** z))))
    res = 156543.03392 * np.cos(np.radians(lat_rows)) / 2 ** z
    e = ndimage.gaussian_filter(np.maximum(elev, 0) if z >= 10 else elev, 1.6 if z >= 10 else 0.8)
    gy, gx = np.gradient(e)
    gx = gx / res[:, None] * zf
    gy = gy / res[:, None] * zf
    # light from the north-west, fairly low (dramatic relief)
    az, alt = math.radians(315), math.radians(38)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    shade = np.clip(shade, 0, 1)
    flat = math.sin(alt)
    land = elev > 0.5
    # drop small "water" patches inland (tidal flats / rice fields at ~0 m): keep sea connected to the frame edge
    wl, n = ndimage.label(~land)
    keep = np.zeros(n + 1, bool)
    edge = np.unique(np.concatenate([wl[0], wl[-1], wl[:, 0], wl[:, -1]]))
    keep[edge] = True
    sizes = ndimage.sum(np.ones_like(wl), wl, index=np.arange(n + 1))
    keep |= sizes > (W * H) * 0.002
    keep[0] = False
    land = ~keep[wl]
    rgb = np.where(land[..., None], lerp_colors(LAND, elev), lerp_colors(SEA, elev))
    k = np.where(land, 0.55 + 0.75 * (shade / flat) ** 1.1 * 0.62, 0.8 + 0.35 * (shade / flat - 1) + 0.2)
    k = np.clip(k, 0.35, 1.35)
    rgb = rgb * k[..., None]
    # soft coastal halo in the sea (atlas engraving feel)
    dist = ndimage.distance_transform_edt(~land)
    halo = np.exp(-dist / (6 if z >= 9 else 3)) * (~land)
    rgb = rgb + halo[..., None] * np.array([18, 26, 28])
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    img.save(f"assets/terrain/{name}.jpg", quality=90)
    s = 2 ** (Z_REF - z)
    meta = {"name": name, "z": z, "x": tx0 * 256 * s, "y": ty0 * 256 * s, "w": W * s, "h": H * s, "px": [W, H],
            "source": "AWS Terrain Tiles (Terrarium) — Mapzen/Tilezen open data; SRTM, ETOPO1, GMTED and others"}
    json.dump(meta, open(f"assets/terrain/{name}.json", "w"), indent=1)
    print(meta, flush=True)


if __name__ == "__main__":
    main()
