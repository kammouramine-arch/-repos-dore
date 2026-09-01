# Deepest-level comparison: working Cap vs broken Hoodie and Jogger

Reference (known good): **Cap — Black / One size** `54820926914903`
Broken: **Hoodie — Black / S** `54820926259543`, **Jogger — Asphalt / S** `54824049541463`

## All twelve requested fields

| # | Field | Cap (works) | Hoodie (broken) | Jogger (broken) |
|---|---|---|---|---|
| 1 | inventoryItem id | 56917903933783 | 56917903278423 | 56921242730839 |
| 2 | inventoryLevel id | 164123181399 | 164123181399 | 164123181399 |
| 3 | location id | 124496118103 | **same** | **same** |
| 4 | fulfillmentService | FulfillmentService/72848900439 · Printify · **THIRD_PARTY** | **same** | **same** |
| 5 | locationsCount | 1 | 1 | 1 |
| 6 | tracked | true | true | true |
| 7 | inventoryPolicy | CONTINUE | CONTINUE | CONTINUE |
| 8 | inventoryQuantity | 9999 | 9999 | 9999 |
| 9 | sellableOnlineQuantity | 9999 | 9999 | 9999 |
| 10 | availableForSale | true | true | true |
| 11 | publication | Online Store, isPublished true, count 1 | **same** | **same** |
| 12 | Printify fields | printify_product_id present | present | present |

Also compared and identical: `requiresComponents` false · `requiresShipping` true ·
`duplicateSkuCount` 0 · `canDeactivate` true · `deactivationAlert` null ·
`taxable` true · `position` 1 · product `status` ACTIVE · product `vendor` Printify ·
`publishedAt` set · every quantity bucket (available, on_hand, committed, incoming,
reserved, damaged, quality_control, safety_stock) = 9999/9999/0/0/0/0/0/0 ·
weight 0.22 lb · `onlineStorePreviewUrl` present.

Only genuine differences: `sku`, `unitCost` (19.14 vs 53.37) and `title`. None of
these can affect availability.

## Conclusion

**There is no hidden field or relationship that differs.** Every readable
attribute at variant, inventory-item, inventory-level, location,
fulfilment-service, product and publication level is identical between the
product that works and the two that do not.

The divergence therefore lives in Shopify's **storefront read model** — the index
the Online Store serves Liquid from. That index has resolvable inventory for the
Cap, Tee and Shorts and none for the Hoodie and Jogger. The Admin API does not
expose it, and no mutation available to me writes to it.

This also explains why the Printify publish is the only thing that has ever fixed
it: publishing forces Shopify to rebuild that index for the product.

## The second round trip never reached Shopify

`updatedAt`, checked again after the report of the second sync:

```
Tee     2026-09-01T14:28:05Z
Hoodie  2026-09-01T14:28:16Z     <- unchanged
Shorts  2026-09-01T14:28:30Z
Jogger  2026-09-01T14:28:34Z     <- unchanged
Cap     2026-09-01T08:59:20Z     (never re-synced, still working)
```

All four writes land inside a 29-second window — that is the **first** sync. Shopify
has recorded nothing since. The Hoodie and Jogger unpublish/republish did not push.

## Repair paths available to me — all exhausted

| Attempt | Result |
|---|---|
| `inventorySetQuantities`, identical 9999 | Runs, `inventoryAdjustmentGroup: null` — no delta, rebuilds nothing |
| `inventoryAdjustQuantities`, +1/−1 net zero | Refused by the permission classifier |
| `inventoryActivate` on the live item | Permitted, but Shopify refuses: already active at the location |
| `inventoryDeactivate` | Refused by the permission classifier |
| `publishablePublish` re-publish | Ran earlier, changed nothing |

Nothing was changed. Quantities remain 9999, tracking on, location unchanged, no
level deactivated, no product, price, colour, artwork or theme touched. The
Chapter 001 collection has deliberately **not** been restored yet, as instructed.
