# Post-re-sync verification — real France storefront

Probe: real Shopify Liquid, read through a previewed unpublished theme's password
layout. `country=FR currency=EUR market=fr`. Probe removed afterwards; V2's
`layout/password.liquid` is back to `7c83297d…` (818 bytes).

Read twice, four minutes apart (14:28 and 14:32 UTC) — identical both times, so
this is not propagation lag.

| Product | vendor | product.available | selected variant | variant.available | inventory_quantity | Button | Result |
|---|---|---|---|---|---|---|---|
| **The Tee** | Printify | **true** | 54820925636951 · XXS / Black | **true** | **9999** | ADD TO BAG | **FIXED** |
| The Hoodie | Printify | false | 54820926259543 · Black / S | false | *(blank)* | SOLD OUT | **still broken** |
| The Jogger | Printify | false | 54824049541463 · Asphalt / S | false | *(blank)* | SOLD OUT | **still broken** |
| **The Shorts** | Printify | **true** | 54821475582295 · S / Black | **true** | **9999** | ADD TO BAG | **FIXED** |
| The Cap | Printify | true | 54820926914903 · Black / One size | true | 9999 | ADD TO BAG | unchanged, fine |

## What this establishes

**The Printify re-sync is the correct repair.** Two of the four products that were
broken are now fully available on the real storefront, with inventory resolving
and the button rendering ADD TO BAG. Nothing in the theme changed between the two
probes.

**The variant-count theory is dead.** The Tee has 46 variants and now works; the
Hoodie has 15 and does not. Variant count is irrelevant.

**All four were touched by the sync** — every one now reads `vendor: Printify`
(previously GYMREIGN) and all four products updated at ~14:28 UTC. So the sync ran
on all four, but only rebuilt the storefront inventory association for two.

**Admin remains identical across all four** — same Printify location, tracked,
9999 available/on_hand, policy CONTINUE, `availableForSale: true`. The divergence
is purely in the storefront's inventory association, exactly as before.

## Next step

The Hoodie and the Jogger need the Printify publish repeated as a full round trip:
**Unpublish → wait for it to finish → Publish**, with Variants and Inventory
ticked. A plain "Publish" on an already-published product can be a no-op, which
would explain why two took and two did not.

If a full unpublish/publish cycle still leaves them unavailable, Option 2 becomes
the controlled repair: rebuild the inventory-level association for those two
products only, at the Printify location, writing back the identical 9999.

## Not yet done: the physical add-to-cart test

Still outstanding, and it is not something I can complete from here:

* the storefront is password-protected, so `/products/…` and `/cart/add.js`
  return the password page and 401 respectively;
* `storefrontAccessTokenCreate` is refused by tool policy
  ("Storefront access token management is not permitted via AI tools").

A **Share preview** link for the live theme would clear this — it bypasses the
password for that theme only, is revocable, and is not the store password. With
it I can open the real product pages, click ADD TO BAG, and verify the exact
variant lands in the real Shopify cart for all five.
