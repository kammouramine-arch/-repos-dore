"""Download a Flickr photo at the largest non-original size (k/h/b) and record provenance.
Usage: python3 tools/flickr_get.py <photo_id> <out.jpg>   -> writes out.jpg + appends assets/provenance.jsonl"""
import json, re, sys, subprocess, html, time
pid, out = sys.argv[1], sys.argv[2]
UA = ["-A", "Mozilla/5.0"]
def get(u): return subprocess.run(["curl", "-sSL", *UA, u], capture_output=True, text=True).stdout
page = get(f"https://www.flickr.com/photo.gne?id={pid}")
lic = re.search(r'"license":\s*"([^"]+)"', page)
owner = re.search(r'"ownerNsid":"([^"]+)"', page)
alias = re.search(r'"pathAlias":"([^"]*)"', page)
realname = re.search(r'"realname":"([^"]*)"', page)
username = re.search(r'"username":"([^"]*)"', page)
title = re.search(r'<meta property="og:title" content="([^"]*)"', page)
desc = re.search(r'<meta name="description" content="([^"]*)"', page)
taken = re.search(r'"dateTaken":"([^"]*)"', page)
lic_id = re.search(r'"license":(\d+)', page)
path = (alias.group(1) if alias and alias.group(1) else (owner.group(1) if owner else "x"))
best = None
for s in ["k", "h", "l", "b"] if False else ["k", "h"]:
    sp = get(f"https://www.flickr.com/photos/{path}/{pid}/sizes/{s}/")
    m = re.search(r'https://live\.staticflickr\.com/[^"]*' + pid + r'_[0-9a-f]+_' + s + r'\.jpg', sp)
    if m: best = m.group(0); break
if not best:
    m = re.search(r'https://live\.staticflickr\.com/[^"]*' + pid + r'_[0-9a-f]+_b\.jpg', page)
    best = m.group(0) if m else None
if not best: print("NO IMAGE", pid); sys.exit(1)
subprocess.run(["curl", "-sSL", *UA, "-o", out, best], check=True)
ft = subprocess.run(["file", "-b", out], capture_output=True, text=True).stdout
rec = {"id": pid, "file": out, "url": f"https://www.flickr.com/photos/{path}/{pid}", "img": best,
       "title": html.unescape(title.group(1)) if title else "", "author": html.unescape((realname.group(1) if realname and realname.group(1) else (username.group(1) if username else ""))),
       "license": lic.group(1) if lic else (f"flickr-license-{lic_id.group(1)}" if lic_id else "?"), "taken": taken.group(1) if taken else "",
       "desc": html.unescape(desc.group(1))[:300] if desc else "", "size": ft.strip()[:80]}
open("assets/provenance.jsonl", "a").write(json.dumps(rec) + "\n")
print(rec["license"], "|", rec["author"], "|", rec["title"], "|", ft.strip()[-30:])
