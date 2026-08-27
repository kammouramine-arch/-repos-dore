#!/usr/bin/env python3
"""
THE UNKNOWN FILE — static page builder.

Why this exists: the site ships as plain HTML with no runtime framework,
but a header and footer repeated across sixteen pages is a maintenance
trap. This script is the only build step. It wraps each fragment in
tools/pages/ with tools/layout.html and writes the finished page to the
site root.

    python3 tools/build.py

Every output file is fully static and self-contained — you can delete
this script and hand-edit the HTML if you prefer. Nothing at runtime
depends on it.

Change SITE_URL before you deploy. It is the canonical origin used for
<link rel=canonical>, Open Graph URLs and the sitemap.
"""
import json, os, re, subprocess, datetime, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, "tools", "pages")
LAYOUT = os.path.join(ROOT, "tools", "layout.html")

SITE_URL = "https://theunknownfile.com"

DEFAULTS = {
    "robots": "index,follow",
    "ogType": "website",
    "ogImage": "assets/img/og-default.png",
    "extraHead": "",
    "scripts": "",
    "jsonld": "",
    "sitemap": True,
    "priority": "0.6",
    "changefreq": "monthly",
}

ORG_JSONLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "The Unknown File",
    "url": SITE_URL + "/",
    "description": "Interactive fictional mystery investigations. Open the file, examine the evidence, file a theory.",
    "sameAs": [
        "https://www.tiktok.com/@theunknownfile",
        "https://www.instagram.com/theunknownfile",
        "https://www.youtube.com/@theunknownfile",
    ],
}



# ── Data ────────────────────────────────────────────────────────────
# One source of truth: the archive index lives in assets/js/data/cases.js
# and is read here through node so the static HTML can never drift from
# what the app renders at runtime.

def case_index():
    mod = os.path.join(ROOT, "assets", "js", "data", "cases.js")
    script = (
        "import('file://%s').then(m=>{"
        "process.stdout.write(JSON.stringify({cases:m.CASES,products:m.PRODUCTS}))})" % mod
    )
    out = subprocess.run(["node", "--input-type=module", "-e", script],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


STATE_CLASS = {"free": "status--free", "available": "status--open",
               "soon": "status--soon", "locked": "status--locked"}


def stars(level):
    if not level:
        return "—"
    return "".join("&#9632;" if i < level else "&#9633;" for i in range(5))


def case_card(c):
    """One archive card. Locked and forthcoming cases render as real
    cards rather than being hidden — an archive with visible edges is
    part of the product."""
    e = html.escape
    playable = c["state"] in ("free", "available")
    href = c.get("href") or None
    cls = ["case-card", "rv"]
    if c["state"] == "locked":
        cls.append("case-card--locked")
    if c["state"] == "soon":
        cls.append("case-card--soon")

    if c["state"] == "free":
        badge = '<span class="stamp stamp--flat" style="color:#3E7A55;border-color:rgba(62,122,85,.5)">FREE</span>'
    elif c["state"] == "available":
        badge = '<span class="stamp">OPEN</span>'
    elif c["state"] == "soon":
        badge = '<span class="stamp stamp--bone stamp--flat">SOON</span>'
    else:
        badge = '<span class="stamp stamp--bone stamp--flat">SEALED</span>'

    facts = []
    if c["difficultyLevel"]:
        facts.append(f'<span>{e(c["difficulty"])}</span>')
    if c["duration"] != "—":
        facts.append(f'<span>{e(c["duration"])}</span>')
    if c["exhibits"]:
        facts.append(f'<span>{c["exhibits"]} exhibits</span>')
    if c["location"] != "—":
        facts.append(f'<span>{e(c["location"])}</span>')

    # The whole card is one tap target: the link lives on the title and
    # its ::after overlay covers the card. No duplicate CTA in the footer.
    title = (f'<a class="case-card__link" href="{href}">{e(c["title"])}</a>'
             if playable and href else e(c["title"]))

    if c["state"] == "free":
        right = '<span class="case-card__price">Free <span aria-hidden="true">&rarr;</span></span>'
    elif playable and c.get("priceDisplay") and c["priceDisplay"] != "—":
        right = (f'<span class="case-card__price">{e(c["priceDisplay"])} '
                 '<span aria-hidden="true">&rarr;</span></span>')
    else:
        # The status on the left already says "in preparation" / "sealed".
        # Repeating it on the right is noise.
        right = ""

    return f"""<article class="{' '.join(cls)}">
  <div class="case-card__vis">
    <img src="{c['cover']}" alt="" loading="lazy" decoding="async" width="1200" height="900">
    <span class="case-card__no">CASE #{c['number']}</span>
    <span class="case-card__badge">{badge}</span>
  </div>
  <div class="case-card__body">
    <h3 class="case-card__title">{title}</h3>
    <p class="case-card__hook">{e(c['hook'])}</p>
    <div class="case-card__facts">{''.join(facts)}</div>
  </div>
  <div class="case-card__foot">
    <span class="status {STATE_CLASS[c['state']]}">{e(c['statusLabel'])}</span>
    {right}
  </div>
</article>"""


def expand_tokens(body, data):
    """<!--#cases limit=4 --> and <!--#cases state=available -->"""
    def repl(m):
        args = dict(re.findall(r"(\w+)=([\w-]+)", m.group(1) or ""))
        rows = data["cases"]
        if "state" in args:
            rows = [c for c in rows if c["state"] == args["state"]]
        if "exclude" in args:
            rows = [c for c in rows if c["id"] != args["exclude"]]
        if "limit" in args:
            rows = rows[: int(args["limit"])]
        return "\n".join(case_card(c) for c in rows)

    return re.sub(r"<!--#cases([^>]*)-->", repl, body)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def parse(raw):
    """Fragments open with a JSON front-matter block:
       <!--meta { "title": "...", ... } -->"""
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
    if not m:
        raise SystemExit("fragment is missing its <!--meta {...} --> block")
    meta = json.loads(m.group(1))
    return meta, raw[m.end():]


def jsonld(objs):
    if not objs:
        return ""
    out = []
    for o in objs:
        out.append(
            '<script type="application/ld+json">'
            + json.dumps(o, ensure_ascii=False, separators=(",", ":"))
            + "</script>"
        )
    return "\n".join(out)


def build():
    layout = read(LAYOUT)
    global DATA
    DATA = case_index()
    built = []
    for name in sorted(os.listdir(PAGES)):
        if not name.endswith(".html"):
            continue
        meta, body = parse(read(os.path.join(PAGES, name)))
        cfg = {**DEFAULTS, **meta}
        cfg.setdefault("ogTitle", cfg["title"])
        cfg.setdefault("ogDescription", cfg["description"])
        cfg["path"] = name if name != "index.html" else ""
        cfg["site"] = SITE_URL
        cfg["body"] = expand_tokens(body, DATA).rstrip()

        blocks = list(cfg.get("schema", []))
        if name == "index.html":
            blocks.insert(0, ORG_JSONLD)
        cfg["jsonld"] = jsonld(blocks)

        page = layout
        for key in ("title", "description", "robots", "ogTitle", "ogDescription",
                    "ogType", "ogImage", "extraHead", "scripts", "jsonld",
                    "body", "path", "site"):
            page = page.replace("{{%s}}" % key, str(cfg.get(key, "")))

        leftover = re.findall(r"\{\{(\w+)\}\}", page)
        if leftover:
            raise SystemExit(f"{name}: unreplaced placeholders {set(leftover)}")

        with open(os.path.join(ROOT, name), "w", encoding="utf-8") as fh:
            fh.write(page)
        built.append((name, cfg))
        print(f"  built  {name}")
    return built


def sitemap(built):
    today = datetime.date.today().isoformat()
    rows = []
    for name, cfg in built:
        if not cfg.get("sitemap", True):
            continue
        loc = SITE_URL + "/" + ("" if name == "index.html" else name)
        rows.append(
            "  <url>\n"
            f"    <loc>{loc}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{cfg['changefreq']}</changefreq>\n"
            f"    <priority>{cfg['priority']}</priority>\n"
            "  </url>"
        )
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write(xml)
    print(f"  built  sitemap.xml ({len(rows)} urls)")

    robots = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /checkout.html\n"
        "Disallow: /order-complete.html\n"
        "\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as fh:
        fh.write(robots)
    print("  built  robots.txt")


if __name__ == "__main__":
    print("THE UNKNOWN FILE — building")
    sitemap(build())
    print("done.")
