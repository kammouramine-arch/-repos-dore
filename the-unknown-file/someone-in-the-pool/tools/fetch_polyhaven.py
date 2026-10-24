"""Download CC0 Poly Haven assets (1k) into assets/polyhaven/<id>/ and record them for the licence register."""
import json, os, sys, urllib.request
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "polyhaven")
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "yfih-production/1.0"})) as r:
        return r.read()
log = []
for kind, ids in (("model", sys.argv[1].split(",") if sys.argv[1] else []), ("tex", sys.argv[2].split(",") if len(sys.argv) > 2 and sys.argv[2] else [])):
    for i in ids:
        d = os.path.join(OUT, i); os.makedirs(d, exist_ok=True)
        info = json.loads(get(f"https://api.polyhaven.com/info/{i}"))
        files = json.loads(get(f"https://api.polyhaven.com/files/{i}"))
        if kind == "model":
            g = files["gltf"]["1k"]["gltf"]
            open(os.path.join(d, os.path.basename(g["url"])), "wb").write(get(g["url"]))
            for rel, f in g.get("include", {}).items():
                p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, "wb").write(get(f["url"]))
        else:
            for m in ("Diffuse", "nor_gl", "Rough"):
                if m in files and "1k" in files[m]:
                    u = files[m]["1k"]["jpg"]["url"]
                    open(os.path.join(d, os.path.basename(u)), "wb").write(get(u))
        log.append({"id": i, "kind": kind, "name": info.get("name"), "authors": list(info.get("authors", {}).keys()),
                    "license": "CC0 1.0", "url": f"https://polyhaven.com/a/{i}"})
        print("ok", i)
reg = os.path.join(OUT, "register.json")
old = json.load(open(reg)) if os.path.exists(reg) else []
ids = {x["id"] for x in log}
json.dump([x for x in old if x["id"] not in ids] + log, open(reg, "w"), indent=1)
