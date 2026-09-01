# SOLD OUT — root cause, proved on the real storefront

## How I got real storefront output

The storefront is password-protected, so I could not fetch a product page. But
`?preview_theme_id=<id>` makes Shopify render the **password page using that
theme**, and V2 was unpublished at the time, so I could write to it. I put a
Liquid probe in V2's `layout/password.liquid`, previewed V2, and read real
Shopify Liquid — real product objects, real France market, real EUR — then
removed it. `layout/password.liquid` on V2 is back to `7c83297d…` (818 bytes).

## What Shopify's own Liquid returns

```
country=FR  currency=EUR  market=fr

THE HOODIE   available=false  variants=15  price_min=13500
  54820926259543  Black / S  avail=false  price=13500  qty=(blank)  mgmt="shopify"  policy="continue"
  54824047739223  French Navy / S  avail=false  price=13500  qty=(blank)  policy="continue"
THE TEE      available=false  variants=46   ... qty=(blank)  policy="continue"
THE JOGGER   available=false  variants=30   ... qty=(blank)  policy="continue"
THE SHORTS   available=false  variants=20   ... qty=(blank)  policy="continue"

THE CAP      available=true   variants=4    price_min=4500
  54820926914903  Black / One size  avail=true  price=4500  qty=9999  policy="continue"
```

Both Liquid access paths (`all_products[handle]` and
`collections['chapter-001'].products`) return the same, so this is not an
artefact of how the probe reads the product.

## What Admin returns for the same variants

```
Hoodie Black/S   availableForSale=true  inventoryQuantity=9999  policy=CONTINUE
                 tracked=true  level=InventoryLevel/164123181399  location=Printify
                 location.isActive=true  location.fulfillsOnlineOrders=true
                 contextualPricing(FR) = 135.00 EUR, min qty 1

Cap Black        availableForSale=true  inventoryQuantity=9999  policy=CONTINUE
                 tracked=true  level=InventoryLevel/164123181399  location=Printify
```

The two records are identical. One works on the storefront, the other does not.

## Ruled out

* **The theme.** The button is rendered from `variant.available` by Liquid. It is
  printing SOLD OUT because Shopify told it the variant is unavailable. Any theme
  change that made it say otherwise would be exactly the faking that must not
  happen.
* **Markets.** One market, France, primary, enabled, region FR. No market catalog
  restricting anything. Contextual price for FR is correct in EUR.
* **Publication.** All five products publish to Online Store, count 1.
  Re-publishing the Hoodie changed nothing.
* **Price.** Every failing variant has a correct price in the storefront output.
* **Inventory policy.** Every failing variant reads `policy="continue"` on the
  storefront, which by Shopify's own rule should make it available regardless of
  quantity.
* **Location.** Same location, same level id, active, fulfils online orders.

## What is actually wrong

On the storefront, `variant.inventory_quantity` comes back **blank** for the four
failing products and `9999` for the Cap. Shopify's Online Store is not resolving
inventory for those products at all, and with tracking on and no resolvable
quantity it reports `available=false` — even though the policy is `continue`.

The only structural difference between the product that works and the four that
do not is the number of variants: **Cap 4; Hoodie 15, Shorts 20, Jogger 30, Tee
46**. The inventory sits at **Printify**, a third-party fulfilment-service
location (`type: THIRD_PARTY`, `shipsInventory: false`), which the storefront has
to resolve through the service rather than from local stock.

This is a Shopify data-plane problem, not a theme problem, and it cannot be fixed
from the theme without lying to customers.

## Fix options — all touch inventory configuration, none change quantities

1. **Stop tracking inventory on the four products.** For made-to-order print-on-
   demand this is the correct configuration: there is no stock to count, Printify
   produces on receipt of the order. Untracked variants are always purchasable, so
   the storefront never has to resolve a quantity. Recorded quantities are not
   deleted and it reverses with one mutation. Admin would show "inventory not
   tracked" instead of the big numbers.
2. **Re-establish the inventory levels** at the Printify location — deactivate and
   reactivate, writing back the same 9999. Keeps tracking and the numbers, but it
   does rewrite the level records.
3. **Re-sync from Printify** — republish the four products from the Printify app so
   it rebuilds the inventory connection itself. Nothing for me to change; needs
   doing in Printify.

I have not made any of these changes.

---

# Follow-up: the actual discriminator is the vendor field

Variant count was a red herring. The real pattern:

| Product | vendor | printify_product_id | variants | Storefront |
|---|---|---|---|---|
| The Tee | **GYMREIGN** | 6a943a0cdf83b77551058bc4 | 46 | **unavailable** |
| The Hoodie | **GYMREIGN** | 6a943a0e47600eef7e0d8ff0 | 15 | **unavailable** |
| The Jogger | **GYMREIGN** | 6a943a10df83b77551058bca | 30 | **unavailable** |
| The Shorts | **GYMREIGN** | 6a946cfed65d512e750d06c6 | 20 | **unavailable** |
| The Cap | **Printify** | 6a943a1247600eef7e0d8ffb | 4 | **available** |

The four broken products are exactly the four whose `vendor` was rewritten from
"Printify" to "GYMREIGN" during the brand identity phase. The one product whose
vendor was never touched is the one that still works. All five still carry the
`printify_custom.printify_product_id` metafield, so the Printify link exists on
all of them — but on the four edited ones the inventory association is no longer
being maintained.

That is a textbook consequence of editing a Printify-managed product on the
Shopify side, and it makes a Printify re-sync the correct repair.

## Why I cannot perform the re-sync

I have no Printify credentials and no Printify API access, and I will not ask for
any. The Printify app is installed on the store with write scopes, but that is the
app's own access — an installed app's sync cannot be triggered through the Shopify
Admin API. Publishing/re-syncing a product is an action inside Printify.

## Exact steps in Printify

For **The Tee, The Hoodie, The Jogger and The Shorts** only — leave The Cap alone:

1. Printify → **My Products** → find the product.
2. Open the **…** menu on the product → **Publish** (or *Edit publishing details*
   → then Publish). If it shows as already published, use **Unpublish** first,
   then **Publish** — that is what rebuilds the Shopify records.
3. In the publishing options make sure **Variants** and **Inventory/quantity**
   are selected, along with anything else you want authoritative from Printify.
   Leave **Title**, **Description** and **Images** unticked if you want the
   Shopify copy and imagery preserved — those are already approved.
4. Repeat for all four. Wait for each to report published.

One warning: a re-sync may set `vendor` back to "Printify" on those four. Leave it
that way until availability is verified — changing it back is what appears to have
broken the association in the first place. We can decide about the vendor label
afterwards; it is not shown anywhere on the storefront.

## Verification is ready to run

The moment the sync is done I re-run the same real-Liquid probe against the France
storefront and report product.available, selected variant.available and
inventory_quantity for all five, then do the five real add-to-cart tests.
