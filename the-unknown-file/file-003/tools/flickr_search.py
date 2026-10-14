"""List Flickr search results (scrapes the public search page's model export).
Usage: python3 tools/flickr_search.py "<text>" [user_id] [license]  -> id | title | WxH | url
license: e.g. '7,9,10' (no known restrictions, CC0, PDM) or '4' (CC BY)"""
import json, re, sys, urllib.parse, subprocess
text = sys.argv[1]; user = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else None
lic = sys.argv[3] if len(sys.argv) > 3 else None
q = {"text": text, "view_all": "1"}
if user: q["user_id"] = user
if lic: q["license"] = lic
url = "https://www.flickr.com/search/?" + urllib.parse.urlencode(q)
html = subprocess.run(["curl", "-sSL", "-A", "Mozilla/5.0", url], capture_output=True, text=True).stdout
m = re.search(r"modelExport:\s*(\{.*?\})\s*,\s*auth:", html, re.S)
seen = set()
for mm in re.finditer(r'"title":"((?:[^"\\]|\\.)*)".{0,6000}?"sizes":\{"data":(\{.*?\})\},"exportMetaType":"pojo"\}.{0,600}?"id":"(\d{9,12})"', html, re.S):
    title, sizes, pid = mm.group(1), mm.group(2), mm.group(3)
    if pid in seen: continue
    seen.add(pid)
    best = None
    for k in re.finditer(r'"width":(\d+),"height":(\d+),"url":"([^"]+)"', sizes):
        w, h, u = int(k.group(1)), int(k.group(2)), k.group(3).replace("\\/", "/")
        if not best or w * h > best[0] * best[1]: best = (w, h, u)
    owner = re.search(r'"ownerNsid":"([^"]+)"', html[mm.start():mm.end()])
    print(f"{pid} | {json.loads(chr(34)+title+chr(34))[:70]} | {best[0]}x{best[1]} | https:{best[2]} | {owner.group(1) if owner else ''}")
