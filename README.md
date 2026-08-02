# RÉVA — Shopify Online Store 2.0 theme

A production Shopify OS 2.0 theme built natively in Liquid for RÉVA, a premium
recovery and wellness brand. This repository *is* the theme: the folders at the
root are the theme root, so it can be zipped and imported directly, or connected
to a store through Shopify's GitHub integration.

The previous static HTML site has been moved to `legacy-html/` for reference. No
part of it is used by the theme.

---

## Structure

```
assets/      reva.css — the whole design system; reva.js — all behaviour
config/      settings_schema.json (theme settings) + settings_data.json (presets)
layout/      theme.liquid, password.liquid
locales/     fr.default.json / en.json  (+ matching *.schema.json for the editor)
sections/    32 sections, incl. header-group.json and footer-group.json
snippets/    8 shared partials
templates/   JSON templates for every page type + customer account templates
scripts/     validate-theme.py — pre-upload integrity check (not part of the theme)
```

## Design system

Everything visual comes from custom properties written by
`snippets/theme-tokens.liquid` out of the theme settings, so re-branding is a
matter of changing settings — never CSS.

- **Colour** — white, near-black `#0B0B0C`, warm beige `#F3EEE7`, soft grey
  `#F4F4F2`, gold `#B08D4F`. Gold is used for hairlines and micro-details only;
  at most one gold surface per page. That restraint is what separates premium
  from costume jewellery.
- **Type** — heading and body fonts come from Shopify's font picker (self-hosted,
  no third-party request). An editorial serif italic carries quotes and accents.
  The whole scale is fluid `clamp()`, so there is no typographic break between
  320 px and 1600 px.
- **Space** — sections breathe at `clamp(4.5rem, 9vw, 9rem)`, adjustable from
  the theme settings. The emptiness is the positioning; do not compress it to
  "fit more in".
- **Motion** — scroll reveals, line-by-line headings, counters, a marquee, a
  quote carousel and height-animated accordions. All of it is neutralised under
  `prefers-reduced-motion`, and can be switched off entirely in the settings.

## Accessibility & resilience

- Reveal animations hide content only when `html.js` is present, so **without
  JavaScript the page is fully visible and indexable**.
- Counters carry their final value in the markup; the script only animates to it.
- Drawers trap focus, close on `Escape`, and restore focus to their trigger.
- Search, add-to-cart, cart quantity changes and the newsletter all work as plain
  form posts if the Ajax layer fails.

## SEO

`snippets/meta-tags.liquid` builds titles, Open Graph and Twitter cards from the
current resource, plus JSON-LD for `Product`, `Organization` and `WebSite`. The
FAQ section emits `FAQPage` structured data. No app required.

## Homepage

`templates/index.json` is the real Shopify homepage and wires up, in order:
hero → marquee → manifesto → featured collection → technology → lifestyle band →
featured products → benefits → figures → before/after → testimonials → FAQ →
newsletter. Every one is editable, reorderable and removable in the theme editor.

---

## Working on the theme

```bash
python3 scripts/validate-theme.py      # integrity check — run before every upload
npx @shopify/cli theme dev             # live preview against the store
npx @shopify/cli theme check           # Shopify's linter
```

### Why `scripts/validate-theme.py` exists

Shopify's ZIP importer **silently drops** any file that fails its validation —
no error, no warning, the file is simply absent and the pages that depend on it
break. Offline `theme-check` does not catch every one of those rules. This
script covers the ones that bite:

- a `range` setting whose `default` is not reachable from `min` by `step`;
- a `{` inside a Liquid tag (`{{ x | append: '?q={term}' }}`), which Shopify's
  Ruby lexer terminates at the brace even inside a quoted string;
- templates referencing sections, blocks or settings that do not exist;
- `t:` keys missing from the locale files, and drift between locales;
- `{% render %}` calls pointing at snippets that do not exist.

Both of the first two rules were real defects caught during the first import.
