# PRINTIFY CONNECTIVITY — CAPABILITY AUDIT & INTEGRATION ROUTE

**Audit complete. No native connector exists. API route is viable and secure.**
Issued 2026-08-23 · No credentials requested, held or used

---

# 1. CAPABILITY AUDIT — WHAT I CHECKED AND FOUND

| Checked | Result |
|---|---|
| Printify MCP server | **None** |
| Printify connector | **None** — `ListConnectors` returned empty for printify, print-on-demand, printful, dropshipping, ecommerce |
| Printify plugin | **None** — `ListPlugins` returned empty |
| Any print-on-demand integration | **None** |
| Tool search across the whole session | Returned Shopify, GitHub, Monitor, Cron — **no Printify anything** |

> ## There is NO native authenticated Printify connection in this environment.
> **There is nothing for you to authorize. No OAuth flow exists here.**

**What does exist:** a Shopify MCP server, connected to a store named **RÉVA**
(`www.maisonreva.fr`) — **not a GYMREIGN store.** See §5.

---

# 2. THE API ROUTE — ANSWERS TO YOUR EIGHT QUESTIONS

## 2.1 Can this environment make authenticated HTTPS requests to the Printify API?

**Yes — proven, not assumed.**

```
GET https://api.printify.com/v1/shops.json
Authorization: Bearer <dummy>
→ HTTP 401 {"error":"Unauthenticated","request_id":"..."}
```

**A 401 with a JSON error body proves the request reached Printify's authentication
layer.** A blocked or TLS-failed request would fail differently. With a valid token the same
call succeeds. The unauthenticated catalogue endpoints already return 200 here.

## 2.2 What credential does it require?

A **Personal Access Token**, sent as `Authorization: Bearer <token>` `[V — developers.printify.com]`.

Printify supports two schemes: **Personal Access Token** for a single merchant account, and
**OAuth 2.0** for platforms managing many accounts. **For you, the personal access token is
the correct and simpler one.**

**Tokens are valid for one year** and are **shown only once at generation** `[V]`.

## 2.3 Minimum scopes required

Printify defines eleven scopes. **For product research, product creation and publishing —
and nothing else — you need six:**

| Scope | Why |
|---|---|
| `shops.read` | Identify which shop is connected |
| `catalog.read` | Blueprints, variants, prices |
| `print_providers.read` | **The provider question that has blocked us for weeks** |
| `products.read` | Read existing products |
| `products.write` | Create and publish products |
| `uploads.write` | Upload GYMREIGN artwork |

**Deliberately excluded — and I recommend you do not grant these:**

| Scope | Why not |
|---|---|
| **`orders.write`** | **This is the scope that can spend money.** Withholding it makes it *technically impossible* for me to place an order, sample or otherwise — a hard guarantee, not a promise |
| `orders.read` | Not needed at this stage |
| `webhooks.read` / `webhooks.write` | Not needed |
| `uploads.read` | Optional; `uploads.write` covers what we need |

> **Grant six scopes, withhold `orders.write`.** That single omission enforces "do not spend
> money" at the API level rather than relying on my compliance.

## 2.4 Exactly where to generate it

**Printify dashboard → My Profile → Connections** `[V]`

Name the token, select the six scopes above, click **Generate token**. **Copy it
immediately — it is displayed only once.**

## 2.5 Can I then inspect your shop and catalogue, and create products?

**Yes.** With those scopes I can list your shops, read the full catalogue **including which
print providers serve each blueprint and at what price** — the exact unknown that has been
marked `UNVERIFIED — AUTHENTICATED PROVIDER ACCESS REQUIRED` — read variants, sizes,
colours and costs, and create product drafts.

## 2.6 Can I publish products to your connected Shopify store?

**Technically yes** — the API has a publish endpoint, rate-limited to 200 publishes per
30 minutes.

**But see §5 first. This is the one place where "yes, technically" would be the wrong
answer to act on.**

## 2.7 Can I select print providers and variants?

**Yes.** Product creation requires specifying `blueprint_id`, `print_provider_id` and
`variant_ids` explicitly — so provider and variant selection is not merely possible, it is
mandatory. This finally lets us answer whether one EU provider serves the Freestyler,
Slammer and Flyer together.

## 2.8 Can I calculate actual product and shipping costs?

**Yes.** Variant-level costs come from the catalogue, and Printify exposes shipping
information per blueprint and provider. **That converts the modelled cost stack into real
landed costs**, and lets the price ladder finally be derived rather than estimated.

---

# 3. THE SECURE CREDENTIAL MECHANISM — NO PASTING IN CHAT

**You are right to refuse to paste a secret into ordinary chat, and you do not need to.**

This environment injects **environment variables** configured in your Claude Code
environment settings. A token placed there is readable by code in the container and
**never appears in the conversation.**

### The procedure

1. Generate the token in Printify — **My Profile → Connections** — with the six scopes
2. In your Claude Code environment settings on claude.ai, add an environment variable:
   **`PRINTIFY_API_TOKEN`** = the token
   *(Environments configure environment variables and setup scripts —
   see https://code.claude.com/docs/en/claude-code-on-the-web)*
3. Start a new session so the variable is injected
4. Tell me it is set. I read it with `os.environ["PRINTIFY_API_TOKEN"]` and never print it

### How I will handle it

- **Read from the environment only.** Never echoed, never logged, never written to a file,
  never committed
- **Never included** in any document, artifact or commit
- **Read-heavy usage only** until you approve otherwise: catalogue, providers, variants,
  costs
- **No product creation or publishing without your explicit approval**
- **No order endpoints** — and with `orders.write` withheld, not possible

**If you would rather not set an environment variable at all, §6 gives you the manual route.**

---

# 4. STRATEGIC FLAG — "ZERO SAMPLE PURCHASES" REVERSES A LOCKED RULE

Raising this once, then proceeding as you direct.

**"Zero sample purchases" contradicts the SAMPLE-FIRST rule locked in Phase 01** and
reaffirmed at every gate since: *"Physical samples are mandatory"*, *"do not approve a final
product based only on a mockup"*, the 80/100 scorecard, and the seven H1–H7 hard-fail gates
you approved.

**Zero inventory and zero samples are different things.** Print-on-demand already gives you
zero inventory — that is its whole point, and it is unaffected by ordering a handful of
samples. Buying four garments is not holding stock.

**What only samples can answer**, all of it currently unresolved:

- Whether AWDis "Deep Black" reads as true deep black or as charcoal — the **H5** gate
- Whether the tonal black-on-black hood print is even legible — flagged as the chapter's
  highest-risk decoration
- Whether embroidery fills the GR monogram's G counter at 45 mm
- Run-to-run variance between two units of the same product
- Whether a stranger would guess the garment was printed to order

**Launching a premium brand on garments nobody has touched is the single largest risk in the
project**, and it is the one the strategy was explicitly built to avoid.

**That said — it is your call, you have made it, and I will proceed.** The API route works
either way, and it costs nothing. If you want a middle path: keep zero inventory, publish
products, and order samples of only the two highest-risk items — the hoodie and the jogger —
before the first customer order rather than before launch.

---

# 5. THE SHOPIFY STORE IS NOT A GYMREIGN STORE

The Shopify store connected to this session is:

| | |
|---|---|
| Name | **RÉVA** |
| Domain | `www.maisonreva.fr` |
| Plan · currency · country | Basic · EUR · France |

**That is the other project.** Publishing GYMREIGN products into it would put a second brand
inside an unrelated storefront.

**Before anything is published, confirm which Shopify store Printify is connected to.** If
it is RÉVA, a separate GYMREIGN store is needed first. I have changed nothing.

---

# 6. THE MANUAL ROUTE — EXACT URLS AND SKUs

If you prefer not to set up the API, these are the exact pages. **Printify blueprint URLs
follow the pattern `printify.com/app/products/{blueprint_id}`.**

## 6.1 Printify — the three garments

| Product | Model | Blueprint | URL |
|---|---|---|---|
| **Freestyler Heavyweight Tee** · 240 GSM | `SXU018` | **3168** | `printify.com/app/products/3168` |
| **Slammer 2.0 Hoodie** · 350 GSM oversized | `SASU024` | **2683** | `printify.com/app/products/2683` |
| **Flyer Jogger** · 350 GSM *(rejected on silhouette)* | `SXU006` | **4628** | `printify.com/app/products/4628` |

**What to record on each page:** every print provider and its country · whether one EU
provider offers all three · price per size in black · the stocked size range, **specifically
whether XS appears** · the black colour name.

## 6.2 Inkthreadable — the current recommended route

| Product | Blank | URL |
|---|---|---|
| THE TEE | S/S Freestyler 240 GSM · £19.69 | `inkthreadable.co.uk/t-shirts` |
| THE HOODIE | S/S Slammer 2.0 350 GSM · £53.40 | `inkthreadable.co.uk/hoodies` |
| **THE JOGGER** | **AWDis JH128 440 GSM · £27.38** | `inkthreadable.co.uk/awdis-heavyweight-joggers` |
| THE CAP | AS Colour 1130 Access Cap · £12.04 | `inkthreadable.co.uk/caps` |

**The one thing to check manually:** whether the JH128 colour swatches include **"Deep
Black"**. AWDis makes exactly four colours and Inkthreadable lists four, so it is almost
certainly there — but the swatch names are not readable from the page source.

---

# 7. WHAT I RECOMMEND

**Set `PRINTIFY_API_TOKEN` with the six scopes and `orders.write` withheld.** It is secure,
it costs nothing, it takes about five minutes, and it finally resolves the provider question
that has blocked this phase — while making it *impossible* for me to spend your money.

**Nothing ordered. Nothing published. No subscription. No store changes. No credential
requested in chat.**

**GYMREIGN — EARN YOUR REIGN.**
