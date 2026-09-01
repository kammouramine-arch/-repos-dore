# Baseline before the third Printify publish attempt

Read-only snapshot taken immediately before the founder re-triggered Publish in
Printify for the Hoodie and the Jogger only. Nothing was modified.

## Watch these timestamps

| | Hoodie | Jogger |
|---|---|---|
| product id | 11112553185623 | 11112553283927 |
| `product.updatedAt` | **2026-09-01T14:28:16Z** | **2026-09-01T14:28:34Z** |
| `product.publishedAt` | 2026-08-30T17:14:31Z | 2026-08-30T17:14:37Z |
| variants | 15 | 30 |
| totalInventory | 149 985 | 299 970 |
| first variant | 54820926259543 · Black / S | 54824049541463 · Asphalt / S |
| `variant.updatedAt` | 2026-08-30T21:31:31Z | 2026-08-30T21:31:44Z |
| `inventoryItem.updatedAt` | 2026-08-30T17:14:26Z | 2026-08-30T20:37:42Z |

If the publish reaches Shopify, `product.updatedAt` must move past 14:28. If it
does not move, the publish never produced a Shopify write and the problem is in
the Printify → Shopify job, not in Shopify.

## If the timestamps do not move — what to collect

**From Printify** (Hoodie and Jogger only):

1. The product's **sync / publishing status** on the product card — "Published",
   "Publishing failed", "Pending", or stuck mid-publish.
2. The **error message** on any failed publish, verbatim.
3. Printify **My Store → connection status** for this Shopify store: connected,
   token expired, reconnect required.
4. Whether the two products still show as **linked to the correct Shopify
   product** — Printify holds `printify_product_id` 6a943a0e47600eef7e0d8ff0
   (Hoodie) and 6a943a10df83b77551058bca (Jogger). If Printify now points at a
   different or deleted Shopify listing, that is the failure.
5. Any Printify-side **activity log** entry for the publish attempts at ~14:28,
   ~15:00 and now.

**From Shopify Support** — this is the evidence they will want:

1. Store `kpv3hw-tm.myshopify.com`, market **France**, currency EUR.
2. Two products report `available=false` with a **blank `inventory_quantity` in
   Liquid**, while the Admin API reports `availableForSale: true`,
   `inventoryQuantity: 9999`, `sellableOnlineQuantity: 9999`,
   `inventoryPolicy: CONTINUE`, `tracked: true`.
3. A third product (**The Cap**, variant 54820926914903) with a byte-identical
   configuration — same location 124496118103, same fulfilment service
   72848900439 (Printify, THIRD_PARTY), same quantities, same publication —
   resolves correctly on the storefront.
4. Two products that were previously in the same broken state (**Tee**, **Shorts**)
   recovered after a Printify publish, with no other change.
5. Ask specifically for a **rebuild of the storefront inventory index** for
   products 11112553185623 and 11112553283927.
6. Note that `inventory_policy = continue` should make a variant available
   regardless of quantity, so `available=false` here contradicts documented
   Liquid behaviour.

Supporting detail is in `34-deep-variant-comparison.md`.
