# V3 — ASCENSION BUILD

Theme: **GYMREIGN Flagship v3 — ASCENSION BUILD (do not publish)** · `204424708439` · role `UNPUBLISHED`.
Duplicated from V2, then rebuilt. V2 and V1 untouched. Nothing published.

Preview: `https://kpv3hw-tm.myshopify.com/?preview_theme_id=204424708439`

## What I took from the reference — and what I refused to take

Ciao Energy runs Webflow + GSAP + ScrollTrigger + SplitText + Lenis + Three.js
(EffectComposer, UnrealBloom, GLTFLoader, RGBELoader), 7 videos, 12,807px tall.
The principles worth stealing are not the technology:

1. **The loader is the first brand moment**, not a spinner — black, the mark
   surfacing, a mono counter.
2. **One object persists across the scroll** and the copy orbits it, rather than
   a stack of unrelated section images.
3. **Technical furniture** — a hairline progress bar, corner crop marks, edge
   readouts — makes a page feel engineered.
4. **Tonal grounds, not uniform black.** Contrast is the rhythm.
5. **Argument by contrast** — strike what the category settles for, state yours
   at full scale.
6. **One word at extreme scale**, everything else small and quiet.
7. **Mobile is the product cropped to full bleed**, type centred over it — not a
   shrunken desktop.

Not copied: their can, purple palette, italic display face, ingredient icon rail,
sound toggle, French copy, and the WebGL stack. A 3D pipeline would have added
megabytes to buy an effect GYMREIGN does not need — the garments are the object.

## What changed

**Overture** (`gr-overture.liquid`) — replaces the static hero. Two viewports, one
sticky stage. The crowned mark travels, scales and rotates on scroll while beat
one (*Reign is not given.*) hands over to beat two (*001 / Ascension*). Words rise
in on a per-word split. Two viewports and it is done — the brand is established,
then it gets out of the way.

**The five** (`gr-five.liquid`) — replaces the four-up grid. Each piece is a
framed plate with the garment large, the type set beside it, and the media side
alternating. The studio shots are multiplied onto the section ground, so the
garments sit on the page instead of inside white rectangles. Hovering shows the
second angle *of the same colourway*.

**Built to a number** (`gr-contrast.liquid`) — the reference's strongest device,
pointed at real specifications: 280 GSM struck through against **350 GSM**;
logo-front-and-back struck against **60 MM, one placement**; restocked-forever
struck against **001, closed for good**. The strike draws itself as the row
arrives; the figure counts up beneath it.

**Collection** — a chapter title card over the mark, then an editorial 7/5 rhythm
rather than a uniform grid, then a closing statement. Sort and pagination
unchanged.

**Mobile menu** — full-screen, clip-path reveal, numbered items rising in
sequence, the five pieces with prices underneath, the mark set large at 5%.

**Header** — transparent over the opening frame, solid once you scroll, and it
inverts to dark type over light sections instead of cutting a black band through
them.

**Preloader** — black, the chrome mark surfacing, an edition-style counter and a
hairline rule. Runs once per session, self-destructs after 4s no matter what, and
never appears for reduced-motion or no-JS visitors.

**Motion engine** — one rAF loop, one IntersectionObserver, no libraries. No
scroll hijacking: native scrolling is left alone, which is the usual reason sites
like this feel broken.

## Availability — unchanged and re-verified

The server-authoritative picker built in the last round is intact and now
deployed. Every option value is a Liquid-rendered link to a real variant id; the
button state is `variant.available` straight from Shopify; no JavaScript reads,
compares or writes availability.

## Acceptance results

| Check | Result |
|---|---|
| All 115 variants, real `?variant=<id>`, button vs Shopify `availableForSale` | **115 / 115 correct** |
| Forced-unavailable control | reads **Sold out**, disabled, size struck |
| Browser click-through, 19 combinations across all five pieces | **19 / 19 ADD TO BAG** |
| Add to bag | variant 54820926259543 · Black / S · €135 — exact |
| Horizontal overflow, 8 pages × 320/390/430/768/1024/1440 | **none** |
| Internal links (22 unique across 11 pages) | **no broken links** — `/account`, `/policies/privacy-policy`, `/cart/checkout` resolve on Shopify, only the local simulator lacks them |
| Reduced motion | preloader removed, no transforms, both beats readable |
| JavaScript disabled | PDP shows ADD TO BAG, 8 variant links work, page complete |
| Keyboard | skip → brand → nav → utilities → colour → size guide → sizes → Add to bag |
| DOMContentLoaded / load | 63–144 ms / 73–170 ms |
| CLS | 0 on every mobile page; 0.055 worst desktop |
| DOM size | 190–404 nodes per page |

## Still not done

No screenshots from the real preview. Chromium now reaches the store through this
environment's proxy (`--ssl-version-max=tls1.2 --disable-http2 --disable-quic`),
but every storefront page still redirects to `/password`. A **Share preview** link
would clear it for one theme without exposing the store password.
