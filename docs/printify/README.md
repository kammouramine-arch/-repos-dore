# GYMREIGN — Printify sourcing spec

Generated from a live Printify API audit. All figures are **USD** (account currency
reported by the API as `x-pfy-currency: USD`). No orders were placed, no inventory was
bought, nothing was published, and Shopify was not touched.

Companion file: [`printify-gymreign-variants.csv`](./printify-gymreign-variants.csv) —
815 rows, every variant ID with colour, size, cost and decoration method.

## 1. Authentication and scope verification

Shop: **28572249** (`sales_channel: shopify`). Shop had **0 products** at audit time.

| Scope | How it was verified | Result |
|---|---|---|
| `shops.read` | `GET /v1/shops.json` | PASS — 200, 1 shop |
| `catalog.read` | `GET /v1/catalog/blueprints.json` | PASS — 200, 2252 blueprints |
| `print_providers.read` | `GET /v1/catalog/print_providers.json` | PASS — 200, 91 providers |
| `products.read` | `GET /v1/shops/28572249/products.json` | PASS — 200, 0 products |
| `products.write` | Draft product create + delete | PASS — created and deleted 19 drafts |
| `uploads.write` | Image upload + archive | PASS — upload 200, archived |
| `orders.write` | **Not exercised.** `GET .../orders.json` returned **403** | Not granted / not used |

The `orders.json` 403 is useful as a control: it proves a missing scope surfaces as
**403**, so the **400 validation** responses from the products and uploads endpoints
confirm those two write scopes are genuinely granted rather than silently ignored.

## 2. The critical constraint: EU fulfilment is very narrow

Only **two** print providers fulfil inside the EU, and their catalogues are small:

| Provider | ID | Location | Blueprints |
|---|---|---|---|
| Textildruck Europa | **26** | Halle (Saale), DE | 42 |
| OPT OnDemand | **30** | Prague, CZ | 30 |

UK providers (T Shirt and Sons `6`, Shirt Monkey `331`, Print Clever `72`) add nothing
for this brief — they are Gildan/AWDIS blanks only.

**Neither EU nor UK providers carry a single jogger, sweatpant, short, cap, beanie or
bucket hat.** Those categories exist only through US providers, chiefly **Fulfill Engine
(217)**. This is the single biggest finding: a fully EU-fulfilled GYMREIGN range is
possible for **tees and hoodies only**.

## 3. Recommended range

### Tier A — EU-fulfilled (Textildruck Europa, PP 26, ships from Germany)

| Product | Blueprint | Cost (core sizes) | Sizes | Colours | Decoration |
|---|---|---|---|---|---|
| **Build Your Brand BY102 Heavy Oversize Tee** — the flagship | **1627** | **$19.57–$20.59** | XS–5XL (9) | 11 inc. Black, Sand, Olive, Charcoal Heather, Magnet | DTG front + back |
| Build Your Brand BY163 Ultra Heavy Cotton Box Tee | **1612** | $24.66 | XS–5XL (9) | 5: Black, Olive, Sand, Union Beige, White | DTG front + back |
| Build Your Brand BY189 Acid Washed Heavy Oversize Tee | **1607** | $23.55 | XS–5XL (9) | 5: Asphalt, Black, Dark Khaki, Union Beige, Soft Lilac | DTG front + back |
| Stanley/Stella STTU788 Freestyler Heavy Tee | **1603** | $23.94–$26.90 | XS–3XL (7) | 5 | DTG front + back |
| AWDIS JH001 College Hoodie | **92** | $25.73–$26.39 | XS–5XL (9) | 12 | DTG front + back |
| B&C WUI24 Pullover Hoodie | **458** | $28.88 | XS–4XL (8) | 5 | DTG front + back |

Blueprint **1627** is the standout: heaviest oversized cut in the EU catalogue, widest
colour range, and the **cheapest cost of any garment audited**.

Stanley/Stella Cruiser 2.0 Hoodie (**1576**, via OPT OnDemand **30**, Prague) is the
premium organic option at **$46.11–$48.95** — strong spec, but nearly double the AWDIS.

### Tier B — US-only categories (Fulfill Engine, PP 217)

| Product | Blueprint | Cost (core sizes) | Sizes | Colours | Decoration |
|---|---|---|---|---|---|
| AS Colour 5069 Classic Oversized Tee | **10922** | **$22.46** | S–3XL | 6 | DTG front/back/both sleeves |
| AS Colour 5080 Heavy Oversized Tee | **1349** | $28.10 | S–3XL | 13 | DTG front + back |
| AS Colour 5146 Heavy Hood | **10953** | $52.38 | XS–3XL | 9 | DTG + DTF, front/back/sleeves |
| AS Colour 5161 Relaxed Hoodie | **1684** | $51.12 | XS–3XL | 12 | **Embroidery only**, left chest |
| AS Colour 5932 Relax Track Pants (baggy) | **10804** | $40.57 | S–3XL | 6 | DTF, both legs |
| AS Colour 5942 Relax Cuffless Track Pants | **10866** | $40.57 | S–3XL | 2 | DTF, both legs |
| AS Colour 5933 Relax Track Shorts 18" | **10818** | $32.05 | S–3XL | 3 | DTF, both legs |
| AS Colour 5939 Relax Faded Track Shorts 18" | **10858** | $32.05 | S–3XL | 3 | DTF, both legs |
| AS Colour AS1140 Icon Cap | **5384** | $21.33 | One size | 10 | DTF + embroidery |
| AS Colour AS1117 Bucket Hat | **1698** | $21.08 | One size | 7 | DTF |
| AS Colour 1107 Cuff Beanie | **5385** | $22.98 | One size | 17 | Embroidery |

## 4. Shipping

Handling time is **10 days** for every provider audited.

**Textildruck Europa (26)** — reaches **62 countries**:

| Destination | First item | Additional |
|---|---|---|
| Germany | $3.89 | $1.19 |
| EU (45 countries) | $4.99 | $1.19 |
| Nordics/Baltics/CH (10) | $7.29 | $1.99 |
| UK + Ireland | $7.79 | $1.19 |
| Rest of world | $10.39 | $8.59 |
| US | $26.59 | $6.59 |

(Hoodies from the same provider are higher: DE $5.49, EU $7.79, UK/IE $8.09, US $33.79.)

**Fulfill Engine (217)** — reaches only **31 countries**:

| Destination | First item (tees/caps) | First item (hoodies/pants) |
|---|---|---|
| US | $4.49–$5.39 | $7.99–$10.39 |
| Canada | $9.69 | $13.19 |
| EU (27 countries) | $13.49 | $18.49 |
| Australia | $12.99 | $22.79 |
| Rest of world | $10.39 | $15.59 |

Shipping a US-made hoodie into the EU costs **$18.49** on top of a **$52** garment.

## 5. Strategy implication

Splitting the range by fulfilment region is the only sensible structure:

- **Launch EU-first on tees and hoodies** from Textildruck Europa. Blueprint 1627 at
  $19.57 + $4.99 EU shipping lands at roughly **$24.56 delivered**; at a €49–55 retail
  that is a healthy margin with 2–5 day EU delivery.
- **Treat joggers, shorts and headwear as a US/global line**, or hold them back. An
  AS Colour jogger delivered to an EU customer costs $40.57 + $18.49 = **$59.06** before
  any margin, which forces a €89+ retail. That is defensible as a premium piece but it
  is a different price architecture from the tees.
- **Caps are the exception in Tier B**: $21.08–$22.98 with only $13.49 EU shipping, so
  they work as an accessory upsell even fulfilled from the US.

## 6. Cost methodology and caveats

- Costs were read from draft products created via the API and **deleted immediately
  afterwards**. Printify v1 does not expose catalogue pricing any other way, and the v2
  catalogue pricing endpoint returns 404 for this token.
- Each probe used **one front placement** at scale 0.6. Printify prices decoration per
  placement, so **adding a back or sleeve print raises the cost** above the figures here.
  Treat these as "blank + one front print".
- The upper end of each range is driven by size upcharges (2XL–5XL).
- Blueprint 1576 was sampled at 95 of 127 variants (Printify caps a product at 100
  enabled variants); the cost range is representative but not exhaustive.
