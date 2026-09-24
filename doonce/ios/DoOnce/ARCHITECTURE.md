# DoOnce iOS — architecture and conventions

iPhone-first, SwiftUI, iOS 17+. Two packages:

- `../DoOnceCore` — platform-independent models, domain logic, service protocols, mocks, sample content. Builds and tests on Linux and macOS. **Never** import UIKit/AVFoundation here.
- `DoOnce` (this app) — SwiftUI, AVFoundation, Vision, Speech, Core Haptics. Generated with XcodeGen from `project.yml`.

```
Sources/
  App/            DoOnceApp, RootView (launch→onboarding→firstRun→main), MainView (tab shell, floating bar, bloom), Router, AppState, RouteViews
  DesignSystem/   Tokens (generated), DSColor/DSFont/DSMotion/DS spacing, Components/, L10n
  Features/       One folder per feature; views + a small @Observable view model where logic exists
  Services/       Camera, Recording, Transcription, Speech, ObjectRecognition, Haptics, Analytics, Permissions
  Resources/      Localizable.xcstrings (generated from design/copy/strings.json), Assets.xcassets, LaunchScreen
Tests/            DoOnceTests (view models), DoOnceUITests (golden path)
```

## The rules every view follows

1. **Tokens only.** Colours: `DSColor.backgroundPrimary`, `DSColor.signal`, `DSColor.textOnMedia`… (`Sources/DesignSystem/Generated/DSColors.swift`). Text: `.dsText(.largeTitle)` or `.font(.ds(.body))`. Spacing: `DS.Space.gutter`, `DS.Space.s4`. Radii: `DS.Radius.large`. Never a literal hex, never a magic 17.
2. **Copy through `L10n`.** `L10n.string("memory.greeting")`, `L10n.plural("object.procedures", n: count)`, `L10n.string("save.next", ["object": name])`. Keys are in `design/copy/strings.json`. No concatenated sentences.
3. **Motion through `DSMotion`.** `withDSAnimation(DSMotion.gentle) { … }` and `.dsAnimation(DSMotion.snappy, value:)` honour Reduce Motion automatically. Springs: `snappy` (press, chips), `gentle` (navigation, sheets), `lively` (bloom, recognition pulse only). Durations: `DSMotion.standard(…)`, `.emphasized(…)`, `.exit(…)`.
4. **Haptics through `HapticsService.shared.play(_:)`** with a `HapticsIntent` from DoOnceCore, fired at the frame the visible change lands. Signature moments: `playRecognitionLock()`, `playSaveSettle()`, `playLoopClose()`. `DSButtonStyle` already plays `.light` on commit, so don't double-fire.
5. **Buttons:** `.buttonStyle(.dsPrimary)` (ink), `.dsSignal` (the one "DoOnce knows this" action), `.dsSecondary`, `.dsGhost`, `.dsSmall`, `.dsGlassIcon`, `.dsOnMediaIcon`, `.dsOnMediaSmall`, or `.ds(kind, size:, fullWidth:)`. Cards and rows use `.buttonStyle(.dsPressable)` / `.dsRowPressable`.
6. **Components:** `DSPhotoCard` (photo is the UI), `DSRow`, `DSList`, `DSSeparator`, `DSCallout`, `DSChip`, `DSAvatar` (initials only), `DSStatusPill`, `DSSegments`, `DSSectionHeader`, `DSEyebrow`, `DSTopBar` (+ `.dsTopBarInset()`), `DSSearchField`, `DSLoopMark` / `DSLoopShape(progress:)`, `DSGlass` / `.dsGlassCapsule()`.
7. **Navigation:** `@Environment(Router.self)`. Push with `router.push(.object(id))`; camera/Do surfaces with `router.present(.look)`; sheets with `router.show(.paywall)`. Every pushed screen hides the system bar (`MainView` does it) and draws its own `DSTopBar`.
8. **State:** `@Environment(AppState.self)`. Read `app.objects`, `app.memories`, `app.memories(for:)`, `app.person(id)`; write with `try await app.save(memory)`. Services live in `app.services` (all protocols from DoOnceCore; mocks by default). Feature view models are `@MainActor @Observable final class` created with `@State` in the view.
9. **Photos and media:** objects and steps carry `MediaRef`s. Use `MediaView(ref:)` (Features/Shared) which resolves local files, remote URLs and `sample:` names from the asset catalog. Placeholders are `DSColor.backgroundSunken`, never a spinner.
10. **Accessibility:** every control has a label; Dynamic Type through `.ds` fonts; Reduce Motion through `DSMotion`; colour is never the only state signal (pair signal colour with a symbol or text).
11. **Safe copy:** confidence-aware. `look.found` / `look.maybe` / `look.unknown.title`. Provenance is always visible: "Julien said…", `review.observed` / `review.inferred` / `review.unclear`. Never invent a step.
12. **Files:** one type per file where reasonable, under ~300 lines. No 2,000-line views. Doc comment on every public type explaining *why*.

## Feature surface map

| Feature | Route | Views |
|---|---|---|
| Launch | phase | `LaunchView(full:onFinished:)` |
| Onboarding | phase | `OnboardingView(onFinished:)`, `AuthView` |
| First run | phase | `FirstRunView` |
| Memory | root | `MemoryHomeView`, `SearchView(initialQuery:)`, `TimelineSection` |
| Object | `.object(id)` | `ObjectDetailView(objectID:)`, `ObjectCreateView` |
| Procedure | `.procedure(id)` | `ProcedureDetailView(memoryID:)`, `ReviewView` (generated / edit) |
| Look | `.look` | `LookView`, `RecognitionOverlay`, `RecognisedObjectSheet` |
| Teach | `.teach(objectID:)` | `TeachView`, `RecordButton`, `LiveIntelligenceLayer`, `ProcessingView(recordingID:)`, `SaveMomentView` |
| Add | `.addObject` | `AddObjectView` |
| Do | `.doMode(memoryID:startStep:)` | `DoModeView`, `HandsFreeBar`, `AskSheet`, `CompletionView`, `SeeOriginalView(memoryID:at:)` |
| Spaces / People | `.spaces`, `.space(id)`, `.people`, `.person(id)` | `SpacesView`, `SpaceDetailView`, `PeopleView`, `PersonDetailView` |
| Household / Share | `.household`, sheet `.share` | `HouseholdView`, `ShareView(objectID:memoryID:)`, `QRImportView` |
| You | root | `ProfileView`, `SettingsView`, `PrivacyView`, `HapticsSettingsView`, `NotificationsView`, `SubscriptionView`, `PaywallView` |
| States | — | `OfflineBanner`, `ErrorStateView`, `PermissionEducationView(kind:then:)`, `EmptyState` |

The interactive prototype at `../../prototype/` is the visual spec: same screens, same copy, same motion. Screenshots of every screen in light and dark are in `../../prototype/review/shots/`.

## Build

```
brew install xcodegen
cd doonce/ios/DoOnce && xcodegen generate && open DoOnce.xcodeproj
```

Sample content is on by default (`DOONCE_SAMPLE_CONTENT=1` in the scheme). Set it to `0` for an empty household.
