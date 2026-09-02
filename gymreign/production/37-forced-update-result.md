# Forced Printify update on the Hoodie — the write landed, availability did not

Probe 2026-09-02T16:41:17Z, real France storefront (`country=FR currency=EUR
market=fr`). Probe removed; V2 `layout/password.liquid` back to `7c83297d…`.

## Answer

**No.** The Hoodie still returns `product.available = false`,
`variant.available = false`, blank `inventory_quantity`, **SOLD OUT**.

## But the write did reach Shopify this time

| | Before | After |
|---|---|---|
| Hoodie `product.updatedAt` | 2026-09-01T14:28:16Z | **2026-09-02T16:39:00Z** |
| Hoodie `variant.updatedAt` (all 15) | 2026-08-30T21:31:31Z | **2026-09-02T16:38:42–51Z** |
| Jogger `product.updatedAt` | 2026-09-01T14:28:34Z | **2026-09-02T02:42:52Z** |

So the toggle worked: forcing a real change breaks Printify's no-op publish.

## The decisive new fact

The storefront **did** pick the change up. The probe now reports
`variants = 16` for the Hoodie, up from 15 — the storefront's own copy of the
product knows about the new variant.

So the storefront index is **not** stale in general. Product data propagates
within seconds. It is specifically the **inventory** portion that will not resolve
for this product: quantity comes back blank and `available` stays false, while
Admin reports 9999 / CONTINUE / tracked / availableForSale true.

That removes the last theory that this is a sync or propagation problem. Both
products have now received fresh writes and neither recovered, while the Tee and
Shorts recovered from an equivalent write. This is a Shopify-side inventory index
fault on two specific products.

## Regression introduced by the toggle — needs fixing in Printify

Disabling and re-enabling 2XL did not restore the previous state:

* Variant count went **15 → 16**.
* The three original 2XL variants were **deleted and recreated with new ids**:
  * Black / 2XL `54820926390615` → `54859631034711`
  * French Navy / 2XL `54824048001367` → `54859631067479`
  * Heather Grey / 2XL `54824048034135` → `54859631100247`
* A **new, unapproved colourway appeared: “White / 2XL”** `54859631133015`,
  inventory item `56957490954583`. White exists in 2XL only.

The Hoodie's approved colourways are Black, French Navy and Heather Grey. White
was not approved and should be removed in Printify — unticking White in the
product's variant selection and publishing again. Deleting it on the Shopify side
would only be undone by the next sync.

Storefront links are unaffected: the theme renders variant ids at request time, so
the recreated 2XL ids resolve correctly.

## Recommendation

Stop trying to fix this through Printify. Both products now take writes normally
and still will not resolve inventory. Open a Shopify Support ticket asking for a
**rebuild of the storefront inventory index** for products `11112553185623`
(Hoodie) and `11112553283927` (Jogger), citing:

1. Liquid returns `available=false` with blank `inventory_quantity`; Admin returns
   `availableForSale: true`, 9999, CONTINUE, tracked.
2. `inventory_policy = continue` should make a variant available regardless of
   quantity — `available=false` contradicts documented Liquid behaviour.
3. **The Cap** (variant 54820926914903) is a byte-identical control that works.
4. The **Tee** and **Shorts** recovered from the identical state after a Printify
   write, proving the index can be rebuilt.
5. Product data for the Hoodie propagated to the storefront on 2026-09-02T16:39Z
   (variant count 15 → 16) while its inventory did not — the fault is isolated to
   the inventory index.
