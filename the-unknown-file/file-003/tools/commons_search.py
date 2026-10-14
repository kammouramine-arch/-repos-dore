"""Search Wikimedia Commons files with licence info.
Usage: python3 tools/commons_search.py "<query>" [limit]  -> licence | WxH | duration | title | url"""
import json, sys, urllib.parse, subprocess, re
q = sys.argv[1]; n = sys.argv[2] if len(sys.argv) > 2 else "40"
p = {"action": "query", "generator": "search", "gsrsearch": q, "gsrnamespace": "6", "gsrlimit": n,
     "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "format": "json"}
url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)
r = subprocess.run(["curl", "-sS", "-A", "TheUnknownFileResearch/1.0 (contact via commons)", url], capture_output=True, text=True).stdout
try: d = json.loads(r)
except Exception: print("ERR", r[:300]); sys.exit(1)
for pg in sorted(d.get("query", {}).get("pages", {}).values(), key=lambda x: x.get("index", 0)):
    ii = pg["imageinfo"][0]; md = ii.get("extmetadata", {})
    lic = md.get("LicenseShortName", {}).get("value", "?")
    art = re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", ""))[:40]
    print(f"{lic:16s} | {ii.get('width')}x{ii.get('height')} | {ii.get('duration', ''):>6} | {ii['mime']:10s} | {pg['title'][5:][:80]} | {art} | {ii['url']}")
