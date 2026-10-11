"""Query Wikimedia Commons politely (honours Retry-After) and record license metadata.
Usage: python3 tools/commons.py list <Category:...>   |  python3 tools/commons.py info <File:...> [...]"""
import json, sys, time, urllib.request, urllib.parse
UA = "TheUnknownFileResearch/1.0 (documentary research; contact via github.com/kammouramine-arch)"
API = "https://commons.wikimedia.org/w/api.php?"
def get(params):
    url = API + urllib.parse.urlencode({**params, "format": "json", "maxlag": "5"})
    for attempt in range(12):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get("retry-after") or 20) + 2
            print(f"HTTP {e.code}, waiting {wait}s", file=sys.stderr); time.sleep(wait)
    raise SystemExit("gave up")
mode, args = sys.argv[1], sys.argv[2:]
if mode == "list":
    for c in args:
        d = get({"action": "query", "list": "categorymembers", "cmtitle": c, "cmlimit": 200})
        for m in d["query"]["categorymembers"]: print(m["title"])
elif mode == "search":
    d = get({"action": "query", "list": "search", "srsearch": " ".join(args), "srnamespace": 6, "srlimit": 50})
    for m in d["query"]["search"]: print(m["title"])
else:
    d = get({"action": "query", "titles": "|".join(args), "prop": "imageinfo", "iiprop": "url|size|extmetadata"})
    for p in d["query"]["pages"].values():
        ii = p.get("imageinfo", [{}])[0]; md = ii.get("extmetadata", {})
        g = lambda k: (md.get(k, {}).get("value", "") or "")[:300]
        print(json.dumps({"title": p["title"], "url": ii.get("url"), "w": ii.get("width"), "h": ii.get("height"),
            "license": g("LicenseShortName"), "artist": g("Artist"), "credit": g("Credit"), "desc": g("ImageDescription")[:200]}))
