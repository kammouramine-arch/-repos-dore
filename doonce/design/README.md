# DoOnce — design

There is no Figma access in this environment, so the design system and the golden path are
delivered as files that a designer can import (html.to.design or Figma's HTML import handles
`components.html` and the prototype pages) and that the engineering side consumes directly. The
organisation mirrors the Figma file requested in the brief:

| Figma page | Where it lives |
|---|---|
| 00 Cover | this file |
| 01 Foundations | `foundations/tokens.json` (source of truth), `components.html` §01–05 |
| 02 Brand | `brand/` — `brand.md`, `logo.svg`, `logo-mono.svg`, `app-icon.svg`, `logo-animated.svg` |
| 03 Components | `components.html` §06–11 (rendered live from tokens, light and dark) |
| 04 Onboarding | prototype screens `launch`, `onboarding` 1–4, `auth`, `firstrun` |
| 05 Memory | `memory`, `memory-empty`, `memory-offline`, `search`, `results`, `spaces`, `space`, `people`, `person` |
| 06 Look | `look`, `look-recognised`, `look-uncertain`, `look-unknown`, `look-error` |
| 07 Teach | `teach`, `teach-recording`, `processing`, `review`, `review-edit`, `objectCreate`, `save` |
| 08 Objects | `object`, `procedure`, `see-original` |
| 09 Do | `do`, `do-handsfree`, `ask`, `complete` |
| 10 Search | `search`, `results` |
| 11 Sharing | `household`, `share`, `qr` |
| 12 Settings | `you`, `settings`, `privacy`, `haptics`, `notifications` |
| 13 Subscription | `subscription`, `paywall` |
| 14 States | `components.html` §12, prototype `offline`, `error-*`, `permission-*`, empty variants |
| 15 Prototype | `../prototype/index.html` — genuinely interactive, every transition wired |
| 16 Motion specification | `motion/motion-spec.md`, `motion/haptics-and-sound.md` |

Screenshots of every prototype screen in both appearances: `../prototype/review/shots/`
(contact sheet: `../prototype/review/contact-sheet.html`).

## Build steps

```
node design/foundations/build-tokens.mjs   # tokens.json → prototype/assets/tokens.css, ios Tokens.swift, DSColors.swift
node design/copy/build-strings.mjs         # strings.json → prototype/assets/strings.js, ios Localizable.xcstrings
```

## Copy

`copy/strings.json` is the single source of product copy (English, with the first French
strings). `copy/terminology.md` fixes the vocabulary: Memory, Object, Space, Person, Step, Teach,
Look, Do, Remembered, Taught by, See original.

## App Store

`appstore/` holds the five-screenshot sequence composed from the prototype captures:
Your world can remember · Show it once · DoOnce remembers how · Find it just by looking ·
Never forget how again.
