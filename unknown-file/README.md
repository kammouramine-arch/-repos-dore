# THE UNKNOWN FILE

*Some cases were never meant to be solved.*

A production-ready website and interactive product for a mystery-investigation
brand: short-form video drives traffic, the site converts it, and the product
is a case file you actually have to solve.

**Static HTML, CSS and ES modules. No framework, no runtime dependencies, no
npm install.** Every page in this directory is a complete file you can open in
a browser. The only build step is a small Python script that stamps a shared
header and footer onto sixteen pages, and it is optional.

---

## Preview it

```bash
cd unknown-file
python3 -m http.server 8000
```

Then <http://localhost:8000>. That is the whole setup.

## Read this first

**[`docs/INTEGRATION.md`](docs/INTEGRATION.md)** — what is production, what is
a demo, and exactly what remains. The short version:

- Everything you can see, read and play is real and finished.
- **Payment takes no money**, and the checkout page says so on the page.
- **Access control is client-side**, so it is a demonstration, not a paywall.
- **No email is sent**, and the confirmation page says so.

Nothing here pretends to work. Every demo surface admits it in the interface,
not just in a document.

## What is in the box

### Pages

| | |
|---|---|
| `index.html` | Home — hero, featured case, how it works, archive, transmissions, final CTA |
| `archive.html` | The archive — twelve files, filterable by state |
| `case-001.html` | Product page for Case #001, built to sell an experience rather than a download |
| `free-case.html` | The free sample case, which is the entire conversion strategy |
| `investigate.html` | **The product.** Three-panel investigation interface |
| `checkout.html` · `order-complete.html` | Purchase flow (demo, clearly marked) |
| `dashboard.html` | My Case Files — progress, notes, export/import |
| `transmissions.html` | How a forty-second clip becomes a case, and the labelling rule |
| `about.html` · `faq.html` · `contact.html` | Brand and support |
| `terms.html` · `privacy.html` · `refunds.html` · `disclaimer.html` | Legal |
| `404.html` | |

### The product

**Case #000 — The Last Guest** (free, 6 exhibits, ~15 minutes). The tutorial.
It teaches exactly one habit — check the instrument before you accept the
impossibility — and gives nothing about Case #001 away.

**Case #001 — The Hollow Hour** (€14.99, 24 exhibits, 2–3 hours). Advanced.
Five witnesses, a record that has been deliberately altered, twelve
cross-references to establish, a five-part graded reconstruction, and one
sealed exhibit released with the conclusion.

Both are original fiction and are labelled as such everywhere they appear.
The solution key and the rules for writing the next one are in
[`docs/CASE-UF-001-KEY.md`](docs/CASE-UF-001-KEY.md) — **spoilers**.

### The investigation interface

Three panels — index, evidence viewer, investigator's board — side by side on
a laptop, three tabs on a phone. Open exhibits in any order, flag them, write
on them, submit two as a cross-reference, keep a notebook, file a theory, and
get graded against the file. Progress is kept between sittings.

### Documentation

| | |
|---|---|
| [`docs/INTEGRATION.md`](docs/INTEGRATION.md) | Status of every system, and the exact remaining work |
| [`docs/BUSINESS.md`](docs/BUSINESS.md) | Funnel, pricing and the reasoning behind it, roadmap, failure modes |
| [`docs/BRAND.md`](docs/BRAND.md) | Colour, type, texture, voice, and the rules that keep it from looking cheap |
| [`docs/CONTENT-LIBRARY.md`](docs/CONTENT-LIBRARY.md) | 36 short-form concepts, categorised, plus the sourcing rules |
| [`docs/CASE-UF-001-KEY.md`](docs/CASE-UF-001-KEY.md) | Solution key and the method for writing a new case |

## Structure

```
unknown-file/
├── *.html                    generated pages — complete and standalone
├── assets/
│   ├── css/uf.css            design system: tokens, components, layout
│   ├── css/investigate.css   the investigation interface
│   ├── fonts/                self-hosted Inter, Instrument Serif, IBM Plex Mono
│   ├── img/                  all original SVG artwork + rendered PNG cards
│   └── js/
│       ├── core/dom.js       DOM helpers
│       ├── core/store.js     local state: progress, notes, entitlements
│       ├── core/ui.js        header, drawer, reveal, accordion, modal, toast
│       ├── data/cases.js     archive index + product catalogue (one source of truth)
│       ├── data/case-uf-000.js   the free case
│       ├── data/case-uf-001.js   Case #001
│       ├── app.js            site behaviour, feature-detected per page
│       └── investigate.js    the investigation application
├── docs/                     business, brand, content and integration
└── tools/
    ├── build.py              wraps tools/pages/*.html in tools/layout.html
    ├── layout.html           the shared shell
    ├── pages/                page fragments with JSON front matter
    ├── fetch-fonts.py        re-download the self-hosted font subsets
    ├── og.html · icon.html   share-card and icon templates
    ├── make-og.sh            render them to PNG with headless Chrome
    └── pngcrop.py            standard-library PNG cropper used by make-og.sh
```

## Editing

**Content and layout** live in `tools/pages/*.html`. Each fragment opens with
a JSON front-matter block (title, description, Open Graph, schema.org), then
plain HTML. After editing:

```bash
python3 tools/build.py
```

That regenerates every page, plus `sitemap.xml` and `robots.txt`.

The build reads the archive index from `assets/js/data/cases.js` through
node, so the static case cards can never drift from what the app renders at
runtime. Add a case there and it appears on the home page, the archive and
the dashboard.

**Prefer to hand-edit the HTML?** Delete `tools/` and nothing breaks. The
generated pages are complete and self-contained; the build step is a
convenience, not a dependency.

**Changing the domain:** one constant, `SITE_URL` at the top of
`tools/build.py`. Every canonical tag, Open Graph URL and sitemap entry
follows from it.

**Regenerating share cards and icons:**

```bash
python3 -m http.server 8899 &
bash tools/make-og.sh /path/to/chrome
```

## Deploying

Static. Any host. Publish directory `unknown-file/`, no build command.
Run `python3 tools/build.py` before you deploy. Long cache on `assets/**`,
short cache on `*.html`. Serve `404.html` as the not-found page.

## Technical notes

- **No dependencies.** Nothing to install, nothing to audit, nothing to
  update. The only third-party code on the page is nothing.
- **Nothing loads from another domain.** Fonts, images and scripts all come
  from this origin, which is also what `privacy.html` promises.
- **Accessible.** Semantic landmarks, visible focus rings, keyboard-operable
  dialogs and drawers with focus trapping, live regions for toasts, 44px+
  touch targets, `prefers-reduced-motion` respected throughout.
- **Phone first.** The design is built at 375–430px and expands. Tables and
  transcripts scroll inside their own frames rather than being squeezed.
- **SEO.** Per-page metadata and Open Graph, canonical URLs, JSON-LD
  (Organization, WebSite, Product, FAQPage, BreadcrumbList), a generated
  sitemap, semantic headings, descriptive filenames. No keyword stuffing.
- **All artwork is original.** Nothing is stock, licensed or borrowed.

## Legal position

Every case published under this brand is a work of fiction, labelled as such
in the file, on the product page, and in the footer of every page. We do not
build paid products around real disappearances. Where short-form content
covers a documented real case, it is labelled documented, sourced on screen,
contains no invented detail, and makes no accusation. The full statement is
`disclaimer.html`, and the rules the content pipeline runs on are in
`docs/CONTENT-LIBRARY.md`.

The typefaces are Inter, Instrument Serif and IBM Plex Mono, all under the
SIL Open Font Licence, which permits the self-hosting used here.

The legal pages are written to match how the product actually behaves, which
is the hard part — but they are not legal advice and no lawyer has reviewed
them. The redacted fields must be completed before you take a payment.
