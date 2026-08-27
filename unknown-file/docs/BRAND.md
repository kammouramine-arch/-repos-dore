# THE UNKNOWN FILE — Brand system

## The idea in one line

We do not tell people what happened. We hand them the file.

## Name and tagline

**THE UNKNOWN FILE**
*Some cases were never meant to be solved.*

The wordmark sets the `I` of FILE in red. It is the only decorative move in
the identity and it should never be explained on the site.

## Positioning

| | |
|---|---|
| **Category** | Interactive mystery investigations |
| **Not** | A blog, a podcast, a true-crime channel, an ebook shop, a horror brand |
| **Feels like** | A classified archive, a documentary, an escape room, a detective's desk |
| **Never feels like** | Halloween, a jump scare, a haunted house, a generated template |
| **Competitor set** | Escape-room-in-a-box products, puzzle subscriptions, narrative games |
| **The moat** | Cases that are genuinely solvable. Almost nobody does the work. |

## Voice

Calm. Intelligent. Cinematic. Serious. Minimal.

The brand speaks the way a good investigator writes a report: short
sentences, exact numbers, no adjectives doing work that a fact could do.
It is never excited, and it never nudges you to be excited.

**Do**

- "At 02:17 the recording stops. Three seconds later, the same voice appears again."
- "The problem is not what the photograph shows. It is the number written under it."
- "Nothing here is supernatural and nothing here is coincidence."

**Never**

- "OMG 😱", "you won't believe", "the most terrifying thing ever"
- Emoji anywhere in body copy
- Exclamation marks
- Rhetorical questions stacked for effect
- Telling the reader how to feel

## Colour

| Token | Value | Use |
|---|---|---|
| `--ink-000` | `#050607` | Page. Near-black, never pure black — pure black kills depth. |
| `--ink-050` – `--ink-400` | `#08090C` → `#1D222B` | Surfaces, cards, raised panels |
| `--bone-100` | `#ECEAE5` | Primary type. Off-white, never `#fff`. |
| `--bone-200` – `--bone-500` | `#C9C7C2` → `#4A4A48` | Secondary type, hints, disabled |
| `--red` | `#B4121C` | The single accent. Dried blood, not fire engine. |
| `--red-bright` | `#D9202B` | Small type on dark, hover states |
| `--amber` | `#B8862B` | Inquiry notes, "in preparation", warnings |
| `--green` | `#3E7A55` | Free, granted, confirmed |

**The red rule.** Red is a scalpel. One stamp, one status dot, one rule
under a heading, one accent in a heading. If a screen has more than about
three red elements, one of them is wrong. Red is never a background for
large areas and never a button fill except on a destructive or already-active
state.

## Type

| Role | Family | Notes |
|---|---|---|
| Display, UI | **Inter** 200–600 | Wordmark and hero at weight 200, tracking `-.045em`, uppercase |
| Case titles, pull quotes | **Instrument Serif** 400 + italic | The warmth against the machine data. Used sparingly. |
| Data, labels, timestamps | **IBM Plex Mono** 400/500 | Every number, every code, every status. Uppercase, tracking `.16em`–`.24em` |

All three are SIL Open Font Licence and self-hosted from `assets/fonts/`.
No third-party font request, which is also what the privacy notice promises.

**The signature move:** cold mono metadata wrapped around a warm serif title.
`CASE #001 · UNRESOLVED` above *The Hollow Hour*. That pairing is the brand.

## Texture

Restraint is the whole point. The effects budget for any screen:

- **Grain** — one fixed layer, `opacity: .032`, `mix-blend-mode: overlay`.
  Should read as film stock. If you can see it, turn it down.
- **Scan lines** — only on hero sections and photographic plates. `.028` alpha.
- **Vignette** — on imagery only, never on flat panels.
- **Motion** — 18px rise, 800ms, one easing curve. Nothing bounces, nothing
  spins, nothing pulses except a single status dot.
- **Everything above respects `prefers-reduced-motion`.**

What we never do: flicker, glitch text, static overlays, blood spatter,
horror typefaces, torn-paper edges, aged-parchment textures, spooky music.

## Imagery

Every image in this project was made for it. No stock, no licensed photos,
no documents relating to real cases. The visual language is:

- **Covers** — a single lit element in a very dark frame. One light source.
- **Evidence plates** — corner registration ticks, a plate number, a file
  timestamp, heavy grain. They read as photographs of documents.
- **Technical sheets** — hairlines, dimension arrows, a north point, a title
  block. Drawn, never rendered.

A photograph in a case file always carries a caption saying it is a
reconstruction. The stamp saying `FICTION` is a design element and a legal
position at the same time.

## Layout

- Phone first, always. Most traffic arrives from a vertical video.
- Generous vertical rhythm: `clamp(4.5rem, 11vw, 9rem)` between sections.
  Whitespace is the largest single contributor to how expensive this looks.
- Hairline borders at `rgba(236,234,229,.09)`. Almost invisible is correct.
- Radii of 2–3px. Nothing is rounded; this is a filing system.
- Tables and transcripts scroll inside their own frame. Never squeeze data.

## The elements that make it feel real

Case numbers. Timestamps to the second. Exhibit codes. Source attributions
under every timeline entry. Signature blocks. Redaction bars. Tag numbers on
a coat. A berth log kept by hand.

The rule behind all of it: **every piece of chrome is load-bearing.** A case
number you cannot look up is decoration. A case number that filters the
index is the brand.
