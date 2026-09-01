#!/usr/bin/env python3
"""
GYMREIGN local storefront simulator.
Renders the theme's Liquid with real product data pulled from Shopify,
emulates the AJAX cart API, and serves everything on localhost so
Chromium can screenshot and drive it without touching the network.

This is a *design verification* harness — the source of truth is Shopify's
own renderer, which validates the same files on upload.
"""
import json, re, sys, os, threading, urllib.parse, subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
THEME = "/home/user/-repos-dore/gymreign/theme"
ASSET_EXTRA = os.path.join(ROOT)  # logo pngs live in web/

from liquid import Environment, CachingFileSystemLoader

# ---------------------------------------------------------------- data model
class LD(dict):
    """dict with attribute-ish drops: supports .size, truthiness, iteration"""
    def __getattr__(self, k):
        if k.startswith("__") and k.endswith("__"):
            raise AttributeError(k)
        try: return self[k]
        except KeyError: return None

def load_products():
    d = json.load(open(os.path.join(ROOT, "products_full.json")))["data"]["products"]["nodes"]
    products = []
    for i, p in enumerate(d):
        media = [LD({
            "id": m["id"], "alt": "", "position": j + 1,
            "src": m["image"]["url"], "width": m["image"]["width"], "height": m["image"]["height"],
        }) for j, m in enumerate(p["media"]["nodes"])]
        url_by_src = {m["src"]: m for m in media}
        variants = []
        for v in p["variants"]["nodes"]:
            vm = v["media"]["nodes"]
            fm = url_by_src.get(vm[0]["image"]["url"]) if vm else None
            variants.append(LD({
                "id": int(v["id"].split("/")[-1]),
                "title": v["title"],
                "price": int(float(v["price"]) * 100),
                "available": v["availableForSale"],
                "options": [o["value"] for o in v["selectedOptions"]],
                "featured_media": fm,
                "option1": v["selectedOptions"][0]["value"] if v["selectedOptions"] else None,
            }))
        _sel = next((v for v in variants if v["available"]), variants[0] if variants else None)
        opts = [LD({
            "name": o["name"],
            "values": [ov["name"] for ov in o["optionValues"]],
            # mirror Liquid: selected_value comes from selected_or_first_available_variant
            "selected_value": (_sel["options"][i] if _sel and i < len(_sel["options"])
                               else o["optionValues"][0]["name"]),
        }) for i, o in enumerate(p["options"])]
        price = int(float(p["priceRangeV2"]["minVariantPrice"]["amount"]) * 100)
        prod = LD({
            "id": int(p["id"].split("/")[-1]),
            "title": p["title"], "handle": p["handle"],
            "description": p["descriptionHtml"], "content": p["descriptionHtml"],
            "vendor": p["vendor"], "type": p["productType"],
            "url": "/products/" + p["handle"],
            "featured_media": media[0] if media else None,
            "media": media, "images": media,
            "options": [o["name"] for o in p["options"]],
            "options_with_values": opts,
            "variants": variants,
            "price": price, "price_min": price, "price_max": price,
            "available": any(v["available"] for v in variants),
            "selected_or_first_available_variant": next((v for v in variants if v["available"]), variants[0] if variants else None),
        })
        products.append(prod)
    order = ["gymreign-the-hoodie-chapter-001", "gymreign-the-tee-chapter-001",
             "gymreign-the-jogger-chapter-001", "gymreign-the-shorts-chapter-001",
             "gymreign-the-cap-chapter-001"]
    products.sort(key=lambda x: order.index(x["handle"]) if x["handle"] in order else 99)
    return products

def _apply_avail_override(products):
    """GR_UNAVAIL="handle:Colour/Size,..." forces variants unavailable, to prove the
    storefront degrades to per-variant sold-out and never blanket sold-out."""
    spec = os.environ.get("GR_UNAVAIL", "").strip()
    if not spec: return products
    for rule in spec.split(","):
        if ":" not in rule: continue
        h, combo = rule.split(":", 1)
        want = [x.strip() for x in combo.split("/")]
        for p in products:
            if p["handle"] != h: continue
            for v in p["variants"]:
                if v["options"] == want: v["available"] = False
            p["available"] = any(v["available"] for v in p["variants"])
            _sel = next((v for v in p["variants"] if v["available"]), p["variants"][0])
            p["selected_or_first_available_variant"] = _sel
            for i, o in enumerate(p["options_with_values"]):
                if i < len(_sel["options"]): o["selected_value"] = _sel["options"][i]
    return products

PRODUCTS = _apply_avail_override(load_products())
BY_HANDLE = {p["handle"]: p for p in PRODUCTS}
CHAPTER = LD({
    "title": "Chapter 001 — Ascension", "handle": "chapter-001",
    "url": "/collections/chapter-001",
    "description": "Five pieces for the work. Published with their measurements. Never reprinted.",
    "products": PRODUCTS, "products_count": len(PRODUCTS), "all_products_count": len(PRODUCTS),
    "sort_by": "", "default_sort_by": "manual",
})
COLLECTIONS = {"chapter-001": CHAPTER, "all": LD({**CHAPTER, "title": "All pieces", "handle": "all", "url": "/collections/all"})}

CART = {"items": [], "note": ""}  # server-side cart emulation

def cart_json():
    items = []
    total = 0
    for it in CART["items"]:
        total += it["final_line_price"]
        items.append(it)
    return {"item_count": sum(i["quantity"] for i in items), "items": items,
            "total_price": total, "currency": "EUR"}

# ---------------------------------------------------------------- liquid env
class Money:
    @staticmethod
    def fmt(cents):
        try: cents = int(cents)
        except Exception: return ""
        s = f"{cents/100:.2f}".replace(".", ",")
        if s.endswith(",00"): s = s[:-3]
        return "€" + s

def image_url(m, width=None, **kw):
    if m is None: return ""
    src = m["src"] if isinstance(m, dict) else str(m)
    sep = "&" if "?" in src else "?"
    return f"{src}{sep}width={width or 720}"

env = Environment(
    loader=CachingFileSystemLoader([os.path.join(THEME, "snippets"), os.path.join(THEME, "sections"), os.path.join(THEME, "layout")], ext=".liquid"),
    strict_filters=False,
)
env.filters["money"] = Money.fmt
env.filters["image_url"] = image_url
env.filters["asset_url"] = lambda name: "/assets/" + str(name)
env.filters["stylesheet_tag"] = lambda href: f'<link rel="stylesheet" href="{href}">'
env.filters["json"] = lambda o: json.dumps(o, default=lambda x: dict(x) if isinstance(x, dict) else str(x))
env.filters["t"] = lambda s, **kw: str(s)
env.filters["money_with_currency"] = lambda c: Money.fmt(c) + " EUR"
env.filters["default_errors"] = lambda x: ""
env.filters["payment_type_svg_tag"] = lambda x, **kw: ""

STRIP_TAGS = [
    (re.compile(r"{%-?\s*schema\s*-?%}.*?{%-?\s*endschema\s*-?%}", re.S), ""),
]

class SectionCtx:
    """expand a section file with its schema defaults + provided settings/blocks"""
    def __init__(self, name):
        self.name = name
        path = os.path.join(THEME, "sections", name + ".liquid")
        src = open(path).read()
        m = re.search(r"{%-?\s*schema\s*-?%}(.*?){%-?\s*endschema\s*-?%}", src, re.S)
        self.schema = json.loads(m.group(1)) if m else {}
        for rx, rep in STRIP_TAGS: src = rx.sub(rep, src)
        # {% sections 'group' %} only in layout; {% form %} handled below
        self.src = src

    def defaults(self):
        out = {}
        for s in self.schema.get("settings", []):
            if "id" in s: out[s["id"]] = s.get("default", "")
        return out

SECTION_CACHE = {}
def get_section(name):
    if name not in SECTION_CACHE: SECTION_CACHE[name] = SectionCtx(name)
    return SECTION_CACHE[name]

FORM_RX = re.compile(r"{%-?\s*form\s+([^%]+?)-?%}(.*?){%-?\s*endform\s*-?%}", re.S)
def expand_forms(src):
    def rep(m):
        head, body = m.group(1), m.group(2)
        action = "/contact"
        if "product" in head: action = "/cart/add"
        if "storefront_password" in head: action = "/password"
        return f'<form method="post" action="{action}" data-product-form>{body}</form>' \
            if "product" in head else f'<form method="post" action="{action}">{body}</form>'
    return FORM_RX.sub(rep, src)

RENDER_RX = re.compile(r"{%-?\s*(render|include)\s+'([^']+)'")

def render_section(name, settings=None, blocks=None, block_order=None, ctx=None):
    sec = get_section(name)
    merged = sec.defaults(); merged.update(settings or {})
    # resolve setting types: product handle -> product drop, collection handle -> drop
    schema_types = {s.get("id"): s.get("type") for s in sec.schema.get("settings", [])}
    for k, v in list(merged.items()):
        if schema_types.get(k) == "product" and isinstance(v, str):
            merged[k] = v  # keep handle; sections use all_products[...] lookup
        if schema_types.get(k) == "link_list" or k == "menu":
            merged[k] = ctx["menus"].get(v if isinstance(v, str) else "main-menu", ctx["menus"]["main-menu"])
    blist = []
    if blocks:
        for bid in (block_order or list(blocks.keys())):
            b = blocks[bid]
            bdefaults = {}
            for bt in sec.schema.get("blocks", []):
                if bt.get("type") == b.get("type"):
                    for s in bt.get("settings", []):
                        if "id" in s: bdefaults[s["id"]] = s.get("default", "")
            bdefaults.update(b.get("settings", {}))
            blist.append(LD({"type": b.get("type"), "settings": LD(bdefaults), "shopify_attributes": ""}))
    src = expand_forms(sec.src)
    tpl = env.from_string(src)
    scope = dict(ctx["globals"])
    scope["section"] = LD({"id": name, "settings": LD(merged), "blocks": blist})
    try:
        return tpl.render(**scope)
    except Exception as e:
        import traceback; traceback.print_exc(file=sys.stderr)
        return f'<pre style="color:red;padding:2rem">SECTION {name}: {e}</pre>'

def render_template(tname, ctx, extra=None):
    tpath = os.path.join(THEME, "templates", tname + ".json")
    tj = json.load(open(tpath))
    body = ""
    for sid in tj["order"]:
        s = tj["sections"][sid]
        body += render_section(s["type"], s.get("settings"), s.get("blocks"), s.get("block_order"), ctx)
    layout_name = tj.get("layout", "theme")
    lay = open(os.path.join(THEME, "layout", layout_name + ".liquid")).read()
    # handle {% sections 'group' %}
    def group(m):
        g = json.load(open(os.path.join(THEME, "sections", m.group(1) + ".json")))
        out = ""
        for sid in g["order"]:
            s = g["sections"][sid]
            out += render_section(s["type"], s.get("settings"), s.get("blocks"), s.get("block_order"), ctx)
        return out
    lay = re.sub(r"{%\s*sections\s+'([^']+)'\s*%}", group, lay)
    lay = expand_forms(lay)
    scope = dict(ctx["globals"])
    scope["content_for_layout"] = body
    scope["content_for_header"] = ""
    try:
        return env.from_string(lay).render(**scope)
    except Exception as e:
        return f"<pre>LAYOUT: {e}</pre><hr>" + body

def base_ctx(page_type="index", page_title="GYMREIGN", extra=None):
    menus = {
        "main-menu": LD({"links": [
            LD({"title": "Chapter 001", "url": "/collections/chapter-001"}),
            LD({"title": "Shop", "url": "/collections/all"}),
            LD({"title": "Our Reign", "url": "/pages/our-reign"}),
        ]}),
    }
    g = {
        "shop": LD({"name": "GYMREIGN — Official Store", "url": "http://127.0.0.1:8899"}),
        "cart": LD({**cart_json(), "currency": LD({"iso_code": "EUR"})}),
        "collections": COLLECTIONS,
        "all_products": BY_HANDLE,
        "routes": LD({"root_url": "/", "search_url": "/search", "account_url": "/account", "cart_url": "/cart"}),
        "request": LD({"locale": LD({"iso_code": "en"}), "page_type": page_type, "origin": "http://127.0.0.1:8899"}),
        "page_title": page_title, "page_description": "GYMREIGN — Chapter 001.",
        "canonical_url": "http://127.0.0.1:8899/",
        "search": LD({"performed": False, "terms": "", "results": [], "results_count": 0}),
        "template": page_type,
        "paginate": LD({"pages": 1, "current_page": 1, "previous": None, "next": None}),
    }
    if extra: g.update(extra)
    return {"globals": g, "menus": menus}

# ---------------------------------------------------------------- paginate shim
# python-liquid lacks shopify's paginate/form tags: pre-strip paginate
PAG_RX = re.compile(r"{%-?\s*paginate\s+[^%]+-?%}|{%-?\s*endpaginate\s*-?%}")
_orig_read = SectionCtx.__init__
def _patched(self, name):
    _orig_read(self, name)
    self.src = PAG_RX.sub("", self.src)
SectionCtx.__init__ = _patched
SECTION_CACHE.clear()

# ---------------------------------------------------------------- http server
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, body, ctype="text/html; charset=utf-8", code=200):
        if isinstance(body, str):
            if ctype.startswith("text/html"):
                body = body.replace(
                    "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900&family=IBM+Plex+Mono:wght@400;500&display=swap",
                    "/assets/fonts.css")
                body = body.replace("https://cdn.shopify.com/", "/cdnproxy/")
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_cdn(self, url):
        out = subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", url], capture_output=True)
        ct = "image/jpeg" if ".jpg" in url or "jpeg" in url else "image/png"
        self._send(out.stdout, ct)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        q = urllib.parse.parse_qs(u.query)
        if path.startswith("/assets/"):
            name = path.split("/assets/")[1].split("?")[0]
            for base in (os.path.join(THEME, "assets"), ROOT, os.path.join(ROOT, "fonts")):
                f = os.path.join(base, name)
                if os.path.exists(f):
                    ct = {"css": "text/css", "js": "application/javascript", "png": "image/png",
                          "jpg": "image/jpeg", "svg": "image/svg+xml", "woff2": "font/woff2"}.get(name.rsplit(".", 1)[-1], "application/octet-stream")
                    return self._send(open(f, "rb").read(), ct)
            return self._send("nope", code=404)
        if path.startswith("/cdnproxy/"):
            url = "https://cdn.shopify.com/" + path[len("/cdnproxy/"):]
            if u.query: url += "?" + u.query
            import hashlib
            cache = os.path.join(ROOT, "imgcache")
            os.makedirs(cache, exist_ok=True)
            key = os.path.join(cache, hashlib.md5(url.encode()).hexdigest())
            if not os.path.exists(key):
                subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", "-o", key, url])
            ct = "image/jpeg" if ".jpg" in url else "image/png"
            return self._send(open(key, "rb").read(), ct)
        if path.startswith("/cdn/"):
            return self._proxy_cdn("https:/" + path[4:])
        if "cdn.shopify.com" in path:
            return self._proxy_cdn(path.lstrip("/"))
        if path == "/cart.js":
            return self._send(json.dumps(cart_json()), "application/json")
        if path == "/" or path == "":
            return self._send(render_template("index", base_ctx("index", "GYMREIGN — Earn your reign.")))
        if path.startswith("/products/"):
            h = path.split("/products/")[1].strip("/")
            p = BY_HANDLE.get(h)
            if not p: return self._send(render_template("404", base_ctx("404", "Not found")), code=404)
            ctx = base_ctx("product", p["title"], {"product": p})
            return self._send(render_template("product", ctx))
        if path.startswith("/collections/"):
            h = path.split("/collections/")[1].strip("/") or "all"
            col = COLLECTIONS.get(h, CHAPTER)
            ctx = base_ctx("collection", col["title"], {"collection": col})
            return self._send(render_template("collection", ctx))
        if path == "/cart":
            return self._send(render_template("cart", base_ctx("cart", "Your bag")))
        if path == "/search":
            terms = (q.get("q") or [""])[0]
            res = [p for p in PRODUCTS if terms.lower() in p["title"].lower()] if terms else []
            search = LD({"performed": bool(terms), "terms": terms, "results": res, "results_count": len(res)})
            for r in res: r["object_type"] = "product"
            return self._send(render_template("search", base_ctx("search", "Search", {"search": search})))
        if path == "/pages/our-reign" or path.startswith("/pages/"):
            handle = path.split("/pages/")[1]
            page = LD({"title": handle.replace("-", " ").title(), "content": "<p>Page body renders from Shopify content.</p>"})
            t = "page.contact" if handle == "contact" else "page"
            return self._send(render_template(t, base_ctx("page", page["title"], {"page": page})))
        if path == "/password":
            return self._send(render_template("password", base_ctx("password", "GYMREIGN")))
        if path == "/404" or True:
            return self._send(render_template("404", base_ctx("404", "Not found")), code=404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode() if length else ""
        u = urllib.parse.urlparse(self.path)
        if u.path == "/cart/add.js" or u.path == "/cart/add":
            try: body = json.loads(raw)
            except Exception: body = dict(urllib.parse.parse_qsl(raw))
            vid = int(body.get("id"))
            qty = int(body.get("quantity", 1))
            for p in PRODUCTS:
                for v in p["variants"]:
                    if v["id"] == vid:
                        for it in CART["items"]:
                            if it["id"] == vid:
                                it["quantity"] += qty
                                it["final_line_price"] = it["quantity"] * v["price"]
                                break
                        else:
                            CART["items"].append({
                                "id": vid, "key": str(vid), "quantity": qty,
                                "product_title": p["title"], "variant_title": v["title"],
                                "url": p["url"], "final_line_price": qty * v["price"],
                                "image": (v["featured_media"] or p["featured_media"])["src"],
                                "options_with_values": [{"name": n, "value": v["options"][i]} for i, n in enumerate(p["options"])],
                            })
                        return self._send(json.dumps(cart_json()), "application/json")
            return self._send(json.dumps({"error": "no variant"}), "application/json", 422)
        if u.path == "/cart/change.js":
            body = json.loads(raw)
            key = str(body.get("id"))
            qty = int(body.get("quantity"))
            CART["items"] = [dict(it, quantity=qty, final_line_price=qty * (it["final_line_price"] // it["quantity"]))
                             if it["key"] == key else it for it in CART["items"]]
            CART["items"] = [it for it in CART["items"] if it["quantity"] > 0]
            return self._send(json.dumps(cart_json()), "application/json")
        return self._send("<h1>posted</h1>")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    print(f"GYMREIGN simulator on http://127.0.0.1:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
