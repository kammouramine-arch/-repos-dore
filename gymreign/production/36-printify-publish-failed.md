# Third Printify publish: no Shopify write at all

Checked immediately after the founder reported the Hoodie and Jogger publishes
complete. Nothing was modified.

| | Baseline (before publish) | Now | Moved? |
|---|---|---|---|
| Hoodie `product.updatedAt` | 2026-09-01T14:28:16Z | 2026-09-01T14:28:16Z | **no** |
| Jogger `product.updatedAt` | 2026-09-01T14:28:34Z | 2026-09-01T14:28:34Z | **no** |
| Hoodie `variant.updatedAt` | 2026-08-30T21:31:31Z | 2026-08-30T21:31:31Z | **no** |
| Jogger `variant.updatedAt` | 2026-08-30T21:31:44Z | 2026-08-30T21:31:44Z | **no** |
| Hoodie `inventoryItem.updatedAt` | 2026-08-30T17:14:26Z | 2026-08-30T17:14:26Z | **no** |
| Jogger `inventoryItem.updatedAt` | 2026-08-30T20:37:42Z | 2026-08-30T20:37:42Z | **no** |

Per the pre-agreed rule, the storefront probe was **not** run: Shopify received no
write, so the storefront cannot have changed, and running it would have required a
temporary theme deploy that was ruled out.

## What the timestamps actually tell us

All five products' last writes:

```
Tee     14:28:05Z   recovered
Hoodie  14:28:16Z   still broken
Shorts  14:28:30Z   recovered
Jogger  14:28:34Z   still broken
Cap     08:59:20Z   never re-synced, never broken
```

The first sync **did** write to all four products inside a 29-second window. Two
recovered from it and two did not. So the original failure was not a missing write
— the write happened and simply did not rebuild the inventory index for the Hoodie
and Jogger.

The second and third publish attempts produced **no write whatsoever**. That is the
signature of Printify treating those two products as already in sync and skipping
the push — a no-op publish. Repeating "Publish" will keep no-opping.

## What is needed to force a real push

The unpublish step is the part that is not working. If Printify's Unpublish is not
actually removing the Shopify listing, the following Publish has nothing to
recreate and writes nothing. Worth checking, in Printify, for the Hoodie and Jogger:

* After Unpublish, does the Shopify listing actually disappear from the store?
  (Shopify product ids 11112553185623 and 11112553283927 still exist, unchanged —
  so it did not.)
* Does the product card show "Publishing failed", "Pending", or stuck mid-publish?
* Is there a **Sync / Update Shopify listing** action distinct from Publish?
* Making a trivial real change in Printify (for example toggling a size on and off
  again in the variant selection) will mark the product dirty and force a genuine
  push on the next publish.

## Evidence to collect

**Printify** — for products `6a943a0e47600eef7e0d8ff0` (Hoodie) and
`6a943a10df83b77551058bca` (Jogger):

1. Publish/sync status shown on each product card, verbatim.
2. Any error text on a failed or partial publish.
3. Store connection status for `kpv3hw-tm.myshopify.com` — connected, token
   expired, reconnect required.
4. Activity/event log entries for the publish attempts at ~14:28, ~15:00 and now.
5. Confirmation that each Printify product still points at the Shopify product id
   above and not at a deleted or duplicate listing.

**Shopify Support** — ask for a rebuild of the storefront inventory index for
products `11112553185623` and `11112553283927`, with this evidence:

1. Store `kpv3hw-tm.myshopify.com`, market France, currency EUR.
2. Liquid returns `product.available = false` and a **blank `inventory_quantity`**
   for both, while the Admin API returns `availableForSale: true`,
   `inventoryQuantity: 9999`, `sellableOnlineQuantity: 9999`,
   `inventoryPolicy: CONTINUE`, `tracked: true`.
3. `inventory_policy = continue` should make a variant available regardless of
   quantity, so `available = false` contradicts documented Liquid behaviour.
4. **The Cap** (variant 54820926914903) is a byte-identical control that works:
   same location 124496118103, same fulfilment service 72848900439 (Printify,
   THIRD_PARTY), same quantities, same publication, same policy.
5. The **Tee** and **Shorts** were in the identical broken state and recovered
   after a Printify publish with no other change — evidence the index can be
   rebuilt and that these two are stuck.

Full field-by-field comparison is in `34-deep-variant-comparison.md`.
