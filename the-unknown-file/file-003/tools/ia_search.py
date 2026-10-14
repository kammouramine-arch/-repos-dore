"""archive.org search. Usage: python3 tools/ia_search.py '<query>' [rows]"""
import json, sys, urllib.parse, subprocess
q = sys.argv[1]; rows = sys.argv[2] if len(sys.argv) > 2 else "50"
p = [("q", q), ("fl[]", "identifier"), ("fl[]", "title"), ("fl[]", "licenseurl"), ("fl[]", "year"), ("rows", rows), ("output", "json"), ("sort[]", "downloads desc")]
u = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(p)
r = subprocess.run(["curl", "-sS", u], capture_output=True, text=True).stdout
try: d = json.loads(r)
except Exception: print(r[:400]); sys.exit(1)
if "response" not in d: print(str(d)[:400]); sys.exit(1)
for x in d["response"]["docs"]:
    t = x.get("title"); t = t if isinstance(t, str) else str(t)
    print(x["identifier"], "|", t[:80], "|", x.get("year"), "|", x.get("licenseurl"))
