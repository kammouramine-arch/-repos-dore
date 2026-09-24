# DoOnce

**The memory layer for the physical world.** Show DoOnce how something is done once; later, point
your phone at the object and it guides you through exactly what you were shown.

SEE → REMEMBER → DO.

This directory holds the whole product effort: design foundations and brand, the interactive
golden-path prototype (the visual and motion spec), and the iOS codebase.

```
doonce/
  design/       tokens (source of truth), brand + logo, motion + haptic specs, copy, component sheet, App Store set
  prototype/    interactive iPhone-sized golden path; Playwright review harness + screenshots of every screen
  ios/
    DoOnceCore/ Swift package: models, domain logic, service contracts, mocks, sample content — builds + tests on Linux
    DoOnce/     SwiftUI app (XcodeGen spec): design system, app shell, features, device services
```

## Status — what is real, what is not

Legend: **DONE** verified here · **PARTIAL** written, not fully verified · **MOCKED** stands in
for a real service · **BLOCKED** needs something this environment does not have.

### Design foundation (Phase 1) — DONE
- Brand and logo ("the Loop": one gesture, once around, nearly closed), static + monochrome + app
  icon + animated reference; verified at 16 px to 1024 px in both appearances.
- Token system (`design/foundations/tokens.json`) generating CSS and Swift; warm neutrals, one
  signal colour (lucid chartreuse) with text-safe variants; contrast checked (≥ 4.5:1 for text).
- Typography scale, spacing, radii, elevation, motion budgets, springs, haptic language, sound notes.
- Copy source (`design/copy/strings.json`) → prototype strings and `Localizable.xcstrings`; terminology.
- Component/state sheet (`design/components.html`) rendered from tokens, light and dark.
- App Store screenshot sequence (`design/appstore/`).
- Figma itself: **BLOCKED** (no Figma access). The file organisation is mirrored in
  `design/README.md`; `components.html` and the prototype import cleanly into Figma.

### Golden-path prototype (Phase 2 shell + the signature moments) — DONE
- `prototype/index.html`: launch → onboarding (interactive demos) → auth → first run → Memory →
  centre bloom → Look → recognition (acquired / uncertain / unknown / error) → Teach → recording
  with live intelligence → processing → review / edit → object creation → save moment → object
  passport → Do mode → hands-free → Ask → See original → completion. Plus search, spaces, people,
  household, share, QR import, notifications, profile, settings, privacy, haptics, subscription,
  paywall, offline, errors, permission education. 53 screens/states × light + dark.
- Reviewed with a Playwright harness (`prototype/review/shoot.mjs`); two review passes with the
  fixes recorded in `prototype/review/REVIEW.md`. No console errors.
- Camera, recognition, transcription and processing are **MOCKED** on timers with the real sample
  transcript; haptics are logged; voice is simulated by buttons.

### iOS — DoOnceCore package — DONE (Linux-verified)
- Models (User, Household, Space, PhysicalObject, Person, Memory, Step with provenance,
  Recording, Transcript, Analysis, MediaRef, Embedding, RecognitionResult, MemoryProgress).
- Domain: ProcedureAssembler (never invents a step; observed / inferred / unclear),
  important-statement and numeric extraction, risk classification, SearchIndex, RecognitionMatcher
  (exact vs category vs unknown), FreshnessPolicy, VoiceCommandParser, MemoryVersioning.
- Service protocols + in-memory/mocks: repositories, transcription, generation, recognition,
  resumable upload that never loses the local file, auth, subscription (free = 5 memories),
  haptics policy, analytics funnel, localisation.
- Sample content: household, spaces, objects, people, 12 memories, the boiler transcript.
- `swift build` + `swift test`: **80 tests, 0 failures** (Swift 6.1, language mode 6, strict concurrency), re-run after integration.

### iOS — DoOnce app — PARTIAL (written and statically reviewed, not compiled here)
- SwiftUI design system (`DSColor`, `.dsText`, `DSMotion` with Reduce Motion, buttons, cards,
  rows, chips, glass with Liquid Glass on iOS 26, the Loop as a `Shape`, Core Haptics patterns),
  app shell (launch phases, floating tab bar with the ◉ centre action, bloom, router with cover
  sheets and `doonce://` deep links, state), every surface in the inventory (launch, onboarding,
  first run, Memory, search, object passport, procedure, Look, Teach, processing, review/edit,
  object creation, save moment, Do, hands-free, Ask, See original, completion, spaces, people,
  household, share, QR, notifications, profile, settings, privacy, haptics, subscription,
  paywall, permission education, offline and error states), device services (AVFoundation
  camera and recorder, Speech transcription and voice commands, Vision feature-print
  recognition, processing pipeline, background upload transport, Live Activity and widget).
- The golden path is wired end to end: Teach → record → processing → review → object creation →
  save moment → Memory shows the object → Look → recognition → Start → Do → completion.
- **Verified here:** every file passes `swiftc -parse` (128 files); API usage cross-checked
  against DoOnceCore, the router and the token set; `ios/DoOnce/STATUS.md` records what is real
  and what is simulated, service by service.
- **BLOCKED on verification:** SwiftUI, AVFoundation and Vision cannot type-check or run on this
  Linux container. Expect a round of compile fixes in Xcode before first run.
- **DEMO by default:** procedure generation (deterministic assembler over the real transcript, no
  language model), transcription and recognition are wired to their mocks so sample content works
  without a microphone or camera (the real services exist and swap in `AppState.init`),
  gauge-based auto-completion (timer), Sign in with Apple result, purchases, uploads (no
  endpoint), share links, persistence (in-memory repositories).
- **BLOCKED (external):** backend (storage/sync, transcription at scale, grounded LLM
  generation), Apple developer account for signing and capabilities, real photography.

### Not started (later phases)
Household sync, sharing backend, professional handoff (QR generation is local only), offline
download pipeline, Apple Watch, Vision Pro, widgets beyond the skeleton, analytics backend.

## Run

```
# Prototype
open doonce/prototype/index.html            # or: cd doonce/prototype && python3 -m http.server 8000
node doonce/prototype/review/shoot.mjs      # requires: npm i playwright

# Core package (macOS or Linux)
cd doonce/ios/DoOnceCore && swift build && swift test

# App (macOS)
brew install xcodegen
cd doonce/ios/DoOnce && xcodegen generate && open DoOnce.xcodeproj
```

## The one sentence

DoOnce lets the physical world remember what people taught you.
