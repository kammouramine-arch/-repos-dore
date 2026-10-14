"""Vector map data for WORLD ATLAS #001 → studio/src/data/geo.json

Coordinates are Web-Mercator "world pixels" at Z_REF = 12 (same frame as the terrain rasters).
Sources:
  - Natural Earth 1:10m and 1:50m Admin-0 countries, rivers (public domain)
  - OpenStreetMap: Gambia River centreline and river-surface polygons (© OpenStreetMap contributors, ODbL)
"""
import json, math
import shapefile
from shapely.geometry import shape, LineString, MultiLineString, Polygon, MultiPolygon, box, mapping
from shapely.ops import linemerge, unary_union, transform

Z_REF = 12
S = 256 * 2 ** Z_REF


def merc(lon, lat):
    x = (lon + 180) / 360 * S
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * S
    return x, y


def to_world(g):
    return transform(lambda xs, ys, zs=None: tuple(zip(*[merc(x, y) for x, y in zip(xs, ys)])), g)


def path_d(g, nd=0):
    """SVG path data for (Multi)Polygon / (Multi)LineString in world px."""
    out = []
    def ring(coords, close):
        pts = [f"{x:.{nd}f},{y:.{nd}f}" for x, y in coords]
        out.append("M" + "L".join(pts) + ("Z" if close else ""))
    if isinstance(g, Polygon):
        ring(g.exterior.coords, True)
        for i in g.interiors: ring(i.coords, True)
    elif isinstance(g, MultiPolygon):
        for p in g.geoms: out.append(path_d(p, nd))
    elif isinstance(g, LineString):
        ring(g.coords, False)
    elif isinstance(g, MultiLineString):
        for l in g.geoms: ring(l.coords, False)
    else:
        for p in getattr(g, "geoms", []): out.append(path_d(p, nd))
    return "".join(out)


def read(path):
    r = shapefile.Reader(path)
    f = [x[0] for x in r.fields[1:]]
    for sr in r.iterShapeRecords():
        yield dict(zip(f, sr.record)), shape(sr.shape.__geo_interface__)


# local metric frame around The Gambia (for the schematic 10 km corridor)
LAT0 = 13.45
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110574
to_m = lambda g: transform(lambda xs, ys, zs=None: ([x * KX for x in xs], [y * KY for y in ys]), g)
from_m = lambda g: transform(lambda xs, ys, zs=None: ([x / KX for x in xs], [y / KY for y in ys]), g)

out = {"zref": Z_REF, "countries": {}, "detail": {}, "labels": {}}

# continent level (50m), Africa + edges of Europe / Middle East
view = box(-30, -40, 60, 42)
for d, g in read("assets/ne/ne_50m_admin_0_countries/ne_50m_admin_0_countries.shp"):
    if not g.intersects(view): continue
    g = g.intersection(view)
    w = to_world(g).simplify(160)
    c = g.representative_point()
    out["countries"][d["ADM0_A3"]] = {"name": d["NAME"], "cont": d["CONTINENT"], "d": path_d(w), "c": merc(c.x, c.y)}

# region level (10m) — Senegal, The Gambia and neighbours
for d, g in read("assets/ne/ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp"):
    if d["ADM0_A3"] not in ("GMB", "SEN", "GNB", "GIN", "MLI", "MRT", "SLE", "CPV"): continue
    w = to_world(g).simplify(6 if d["ADM0_A3"] in ("GMB", "SEN") else 25)
    out["detail"][d["ADM0_A3"]] = {"name": d["NAME"], "d": path_d(w)}
    if d["ADM0_A3"] == "GMB":
        gmb = g
        # outline as a single ring (for "trace the border" animations)
        ring = w.exterior if isinstance(w, Polygon) else max(w.geoms, key=lambda p: p.area).exterior
        out["gmb_ring"] = path_d(LineString(ring.coords))
        bx = g.bounds
        out["gmb_bounds"] = [*merc(bx[0], bx[3]), *merc(bx[2], bx[1])]
    if d["ADM0_A3"] == "SEN":
        sen = g

# The Gambia: detailed outline from geoBoundaries (World Bank data, CC BY 4.0); Senegal adjusted to match it
gb = shape(json.load(open("assets/gb/gmb_adm0.geojson"))["features"][0]["geometry"]).buffer(0)
gb_main = max(gb.geoms, key=lambda p: p.area) if gb.geom_type == "MultiPolygon" else gb
sen = unary_union([sen, gmb]).difference(gb).buffer(0)
gmb = gb
w = to_world(gb).simplify(4)
out["detail"]["GMB"] = {"name": "The Gambia", "d": path_d(w)}
out["detail"]["SEN"] = {"name": "Senegal", "d": path_d(to_world(sen).simplify(6))}
out["gmb_ring"] = path_d(LineString(to_world(gb_main).simplify(4).exterior.coords))
# land boundary between The Gambia and Senegal (shared edge) — the part of the GMB outline touching SEN
shared = gmb.boundary.intersection(sen.buffer(0.004))
out["gmb_sen_border"] = path_d(to_world(linemerge(shared) if shared.geom_type == "MultiLineString" else shared).simplify(6))

# Gambia River (OSM centreline, merged) + upstream (NE) for regional views
osm = json.load(open("assets/osm/gambia_river.json"))
lines = [LineString([(p["lon"], p["lat"]) for p in e["geometry"]]) for e in osm["elements"] if e["type"] == "way"]
merged = linemerge(unary_union(lines))
pieces = list(merged.geoms) if merged.geom_type == "MultiLineString" else [merged]
# the river is split around MacCarthy Island: chain the main pieces west → east (one island channel included)
pieces = sorted([p for p in pieces if p.length > 0.05], key=lambda g: g.bounds[0])
chain = []
for pc in pieces:
    c = list(pc.coords)
    if c[0][0] > c[-1][0]: c = c[::-1]
    if chain and c[0][0] < chain[-1][0] - 0.02:  # overlapping alternative channel: skip
        continue
    chain += c
river = LineString(chain)
out["river"] = path_d(to_world(river).simplify(4))
up = [g for d, g in read("assets/ne/ne_10m_rivers_lake_centerlines/ne_10m_rivers_lake_centerlines.shp") if d.get("name") == "Gambia"]
out["river_up"] = path_d(to_world(unary_union(up)).simplify(20))
sen_r = [g for d, g in read("assets/ne/ne_10m_rivers_lake_centerlines/ne_10m_rivers_lake_centerlines.shp") if d.get("name") in ("Sénégal", "Bafing", "Falémé", "Casamance", "Saloum")]
out["rivers_region"] = path_d(to_world(unary_union(sen_r)).simplify(20))

# river surface polygons (OSM natural=water + water=river), merged
wj = json.load(open("assets/osm/gambia_water.json"))
polys = []
for e in wj["elements"]:
    if e["type"] == "way" and len(e["geometry"]) > 3:
        try: polys.append(Polygon([(p["lon"], p["lat"]) for p in e["geometry"]]).buffer(0))
        except Exception: pass
    elif e["type"] == "relation":
        for m in e.get("members", []):
            if m.get("role") == "outer" and len(m.get("geometry", [])) > 3:
                try: polys.append(Polygon([(p["lon"], p["lat"]) for p in m["geometry"]]).buffer(0))
                except Exception: pass
water = unary_union(polys)
water = water.intersection(box(-17.2, 12.9, -13.6, 14.0)).intersection(gb.buffer(0.02))
out["river_water"] = path_d(to_world(water).simplify(3))

# schematic "≈10 km either side" band (illustrative — NOT the surveyed boundary)
rm_full = to_m(river)
# the 1889 principle applied "as far as Yarbutenda" (near Koina, ≈13.8°W)
river_1889 = river.intersection(box(-17.5, 12, -13.80, 15))
if river_1889.geom_type != "LineString": river_1889 = max(river_1889.geoms, key=lambda g: g.length)
rm = to_m(river_1889)
# schematic only: smooth the meanders (moving average over ~25 km) before offsetting ±10 km
import numpy as np
_n = 600
_pts = np.array([rm.interpolate(i / (_n - 1), normalized=True).coords[0] for i in range(_n)])
_w = int(25000 / (rm.length / _n))
_k = np.ones(_w) / _w
_sm = np.stack([np.convolve(np.pad(_pts[:, j], (_w // 2, _w - 1 - _w // 2), mode="edge"), _k, mode="valid") for j in range(2)], 1)
rm = LineString(_sm)
band = rm.buffer(10000, cap_style=2, join_style=1)
band_w = to_world(from_m(band)).simplify(10)
out["band_10km"] = path_d(band_w)
north = rm.parallel_offset(10000, "left", join_style=1)
south = rm.parallel_offset(10000, "right", join_style=1)
out["off_n"] = path_d(to_world(from_m(north)).simplify(10))
out["off_s"] = path_d(to_world(from_m(south)).simplify(10))

# places (lon, lat) — modern positions of historical sites
P = {
    "Banjul": (-16.578, 13.454),  # Bathurst, founded by the British in 1816 on St Mary's Island
    "Kunta Kinteh Island": (-16.360, 13.316),  # James Island
    "Albreda": (-16.383, 13.335),
    "Janjanbureh": (-14.765, 13.537),  # Georgetown, MacCarthy Island
    "Koina": (-13.866, 13.478),  # near Yarbutenda
    "Saint-Louis": (-16.489, 16.026),
    "Gorée": (-17.398, 14.667),
    "Dakar": (-17.447, 14.693),
    "Ziguinchor": (-16.272, 12.583),
    "Kaolack": (-16.073, 14.146),
    "Tambacounda": (-13.667, 13.770),
    "Basse Santa Su": (-14.214, 13.310),
    "Farafenni": (-15.600, 13.567),
    "Soma": (-15.533, 13.433),
}
out["places"] = {k: merc(*v) for k, v in P.items()}
out["lonlat"] = {k: v for k, v in P.items()}
json.dump(out, open("studio/src/data/geo.json", "w"), separators=(",", ":"))
print({k: (len(v) if isinstance(v, (str, dict)) else v) for k, v in out.items() if k not in ("places", "lonlat")})
print("river length km", round(rm_full.length / 1000), "to Yarbutenda", round(rm.length / 1000))

# samples along the river (mouth → interior) and along the GMB–SEN land border, for animation
rw = to_world(river)
out["river_pts"] = [list(map(lambda v: round(v, 1), rw.interpolate(i / 199, normalized=True).coords[0])) for i in range(200)]
bl = shared if shared.geom_type == "LineString" else linemerge(shared)
segs = [bl] if bl.geom_type == "LineString" else list(bl.geoms)
pts = []
for sgm in segs:
    sw = to_world(sgm)
    n = max(2, int(sgm.length / 0.09))
    pts += [list(map(lambda v: round(v, 1), sw.interpolate(i / (n - 1), normalized=True).coords[0])) for i in range(n)]
out["border_pts"] = pts
# coastal opening of The Gambia (GMB outline within ~2 km of the sea)
coast = gb.boundary.difference(sen.buffer(0.01))
out["gmb_coast"] = path_d(to_world(coast).simplify(4))
json.dump(out, open("studio/src/data/geo.json", "w"), separators=(",", ":"))
print("river_pts", len(out["river_pts"]), "border_pts", len(pts), "coast", len(out["gmb_coast"]))
