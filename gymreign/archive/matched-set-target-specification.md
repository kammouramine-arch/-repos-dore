# ARCHIVED TARGET SPECIFICATION — THE MATCHED SET

**Status: ARCHIVED, ACTIVE TARGET. Not a cancelled product.**
Archived 2026-08-23 · Originating work: Phases 03, 04, 04.5

> This specification is preserved because **the product was never the problem.** The
> matched hoodie-and-jogger system was validated as a garment system and blocked only by
> print-on-demand fulfilment geography. When the supply chain can support it, this document
> is the brief — no re-research required.

---

## 1. WHY THIS IS ARCHIVED RATHER THAN ABANDONED

The evidence phase established, at primary-source level:

- The ideal matched set **exists as a garment system** `[V]`
- Stanley/Stella Slammer 2.0 and Flyer are **genuinely compatible on paper** `[V]`
- **Both 350 GSM** `[V]`
- **Both 80/20 cotton / recycled polyester** `[V]`
- **Both 3-end fleece** `[V]`
- **Both in the same heavyweight family** `[V]`
- **The blocker is EU POD fulfilment, not product quality** `[V]`

Printful's EU catalogue does not satisfy the requirement — proven exhaustively at API
level. Printify strongly indicates the same limitation across all six EU/UK providers
checked.

**Nothing about the product specification failed. Only the infrastructure did.**

---

## 2. THE TARGET SPECIFICATION

| Requirement | Target |
|---|---|
| **Weight** | ≈350 GSM, hoodie and bottom matched to the same weight class |
| **Composition** | 80% cotton / 20% recycled polyester, or a demonstrably superior cotton-dominant equivalent |
| **Fabric construction** | 3-end fleece, brushed back, soft cotton face |
| **Manufacturer** | Same manufacturer, or a demonstrably compatible blank family |
| **Colour** | **Matched black tone** — verified physically, in daylight and 4000K |
| **Construction** | Premium: ribbed cuffs with recovery, flat unbranded drawcord, no branded trims |
| **System** | A true hoodie + jogger system, designed and sold as one |
| **Branding** | Suitable for GYMREIGN Datum placement — measured elevation from hem, per size |
| **Fulfilment** | Suitable for global fulfilment: EU, UK, US at minimum |

### Reference garments — the benchmark to match or beat

| | Slammer 2.0 `SASU024` | Flyer Jogger `SABU006` / `SXU006` |
|---|---|---|
| Weight | 350 GSM · 10.3 oz | 350 GSM · 10.3 oz |
| Composition | 80% ringspun cotton / 20% polyester | 80% organic combed ringspun / 20% recycled polyester |
| Fabric | Soft 3-end fleece | Brushed 3-end fleece, soft cotton face |
| Ribbing | 2×1 cuff and hem | 1×1 rib knit cuffs |
| Label | Tear-away | Tear-away, recycled polyester |

**Known imperfection to resolve if this pair is used:** the rib structures differ, 2×1
against 1×1. Minor, visible only on close inspection, but it should be confirmed on a
physical sample rather than assumed away.

---

## 3. THE STANDARD THAT MUST NOT BE LOWERED

**Explicitly rejected, permanently:**

- Lightweight joggers used to preserve a product count
- All-over-print polyester bottoms — they fail on material, on colour matching, and on
  decoration method
- Any jogger materially inferior to the hoodie it is paired with
- Any pair whose blacks do not match in daylight

> **Three exceptional products beat four compromised products.** That principle produced
> this archive and it governs any future attempt to revive the set.

---

## 4. TRIGGER CONDITIONS

Revisit when **any one** becomes true:

1. An EU-fulfilling POD provider adds a heavyweight cotton jogger from a manufacturer that
   also supplies a matching hoodie
2. Printify confirms an EU print provider for both blueprints — see §5
3. GYMREIGN opens a US region, where the pair already exists (Printful Lane Seven Urban:
   LS16001 + LS16006, both 80/20, both 340 g/m², same product line)
4. Volume and capital justify a Stanley/Stella trade account plus a European decorator
5. The Phase 01 bulk-transition triggers are met on any SKU

## 5. THE OUTSTANDING VERIFICATION

```
GET https://api.printify.com/v1/catalog/blueprints/4628/print_providers.json
GET https://api.printify.com/v1/catalog/blueprints/2683/print_providers.json
Authorization: Bearer <token>
```

If an EU provider appears for both, trigger condition 2 is met immediately.

---

## 6. WHEN IT RETURNS, ITS PLACE IS AN OPEN DECISION

**Founder instruction: the matched set is not automatically Chapter 002.** When the supply
chain supports it, decide then whether it is a Chapter 001 extension, a limited
continuation, a Chapter 002 product, or a permanent GYMREIGN essential.

**That decision is deliberately not pre-made here.**

---

**GYMREIGN — EARN YOUR REIGN.**
