# DoOnce iOS — what is real, what is simulated

Every service sits behind a protocol from `DoOnceCore`; `AppState.init` wires them from
`ServiceConfiguration` (see "Service modes" below) and `AppState.serviceStatus` reports the
result in Settings → Services. Views never know which implementation they talk to.

Legend: **DONE** real and reviewed · **PARTIAL** real but incomplete or unverified on device ·
**DEMO** stands in for a real service · **BLOCKED** needs macOS/Xcode, a device or credentials.

## Verification in this environment

| Check | Result |
|---|---|
| `DoOnceCore` — `swift build` + `swift test` (Linux, Swift 6.1, language mode 6) | DONE — 134 tests, 0 failures |
| App logic on Linux — `ios/LinuxTypecheck` (pipeline, Do-mode and search view models, grounded answers, timeline grouping, against DoOnceCore with stubbed device services) | DONE — 29 tests, 0 failures |
| Backend gateway — `doonce/backend` `npm run typecheck` + `npm test` | DONE — 11 tests, 0 failures; the live model call is BLOCKED BY CREDENTIALS |
| App, widgets, tests — `swiftc -parse` on every file (137 files) | DONE — no syntax errors |
| **App — real Xcode project generation, build, simulator, XCTest** (`.github/workflows/doonce-ios.yml`, GitHub-hosted macOS runner, Xcode 26.6, iOS 26.5 Simulator SDK, unsigned) | **DONE** — XcodeGen generates the project; `DoOnce` + `DoOnceWidgets` build for `iphonesimulator`; installs and launches on an iPhone 17 Pro simulator; `DoOnceTests` **44/44**, `DoOnceUITests` **7/7 light + 7/7 dark** (incl. the golden path). See `ios/ci.sh` |
| App — physical device, TestFlight, Apple signing | BLOCKED BY ENVIRONMENT — needs an Apple developer team and a physical iPhone, neither available in CI or this session |
| Visual review | DONE for the prototype (106 captures, two passes); DONE for the native app — a CI screenshot walk of the real SwiftUI app (not the prototype) in light and dark, reviewed and iterated on (see "Native visual QA" below) |

## Product surfaces

| Surface | Status | Notes |
|---|---|---|
| Launch (logo forms, echo, skip, Reduce Motion) | DONE | `LaunchView`, Core Haptics loop-close pattern |
| Onboarding 1–4 + auth page | DONE | Live demos in scenes 2–4 are local animations (not the camera) |
| Sign in with Apple | PARTIAL | Live: `AppleSignInService` keeps the credential in the Keychain, restores it at launch (`getCredentialState`), cancel is silent, failure shows a calm inline error; a signed-out live build lands on the auth page. Demo: the mock accepts anything. Token verification is the gateway's job |
| First-use introduction | DONE | Hosts its own presenters; enters the shell after the first save |
| Memory home, timeline, search | DONE | Search is `DoOnceCore.SearchIndex`, real ranking over local data |
| Object passport, procedure detail | DONE | Rename / move / delete write through the repositories |
| Centre action bloom → Look / Teach / Add | DONE | |
| Look: camera, recognition sequence, sheets | PARTIAL | Camera and Vision are real; recognition quality depends on feature prints (see Services) |
| Teach: pre-record, recording, markers, live captions, chips, ribbon, stop | PARTIAL | Real AVFoundation + Speech; unverified on device |
| Import a video | PARTIAL | `PHPickerViewController`; the imported file becomes a Recording |
| Processing (secured → transcribing → moments → understanding → creating steps → preparing) | DONE | Resumable: a `ProcessingJob` is saved at every stage; a recording that never reached review shows as "Finish remembering" on Memory home and resumes from its checkpoint. A failed transcription fails the job with a clear message (never a stand-in transcript) |
| Review / edit (reorder, split, combine, remove, warning, replace frame, rename) | DONE | Edits of a saved memory go through `MemoryVersioning` |
| Object creation (suggest / correct / edit / generic, spaces) | DONE | Embeds reference images with Vision; "Add angle" from the passport appends photos and embeddings |
| Save moment (memory absorbed by the object) | DONE | Core Haptics settle pattern |
| Do mode (one step per screen, swipe, progress, warnings, provenance) | DONE | Progress persisted as `MemoryProgress` through the store; screen stays awake during a procedure; steps loop their real clip when one was cut |
| Hands-free (voice intents, spoken steps) | PARTIAL | Real `SFSpeechRecognizer` + `AVSpeechSynthesizer`; unverified on device |
| Automatic step completion ("Looks good — 1.5 bar") | DEMO | `GaugeCompletionMonitor` fires on a timer; the Vision gauge reader is not written |
| Ask within memory | DONE | `TranscriptGroundedAnswerer`: local, cites a timestamp, never invents |
| See original | PARTIAL | Plays the original at the exact time from the recording's path or the media library's; key-frame fallback otherwise |
| Completion (loop resolves, accuracy question) | DONE | |
| Spaces, people, household, share, QR import, notifications | PARTIAL | Local only; share links point at a placeholder domain, QR scanning is a placeholder frame |
| Profile, settings, privacy, haptics, subscription, paywall | PARTIAL | Live: StoreKit 2 prices and trial, skeleton while loading, "not available yet" without products. Demo: mock plans marked "Demo". Settings has Services, real Sign out and Delete account |
| Permission education → system prompt | DONE | Contextual, never at launch |
| Offline banner, error states, empty states | DONE | |
| Live Activity + Continue widget | PARTIAL | Written against ActivityKit/WidgetKit; needs the app group entitlement and a device |

## Services

Status is per mode: **live** (`DoOnceServiceMode: live`) and **demo** (the shipped default).

| Service | Implementation | Live | Demo |
|---|---|---|---|
| Storage | `DoOnceCore.FileStore` (one JSON document, atomic writes) in `Application Support/DoOnce/store`; media in `…/media` (excluded from backup); one instance behind every repository, progress and job slot | DONE | DONE — seeded with `SampleData` on first run when `DOONCE_SAMPLE_CONTENT=1` |
| Camera | `CameraSession` / `CaptureEngine` (AVFoundation, 1080p, torch, focus, interruption + background recovery, first-frame gate) | PARTIAL — unverified on device | same |
| Recording | `MovieRecorder` records straight into `MediaLibrary.originalURL` (no second copy); `KeyFrames` writes frames and the thumbnail into the library; `StepClipExporter` cuts per-step mp4 clips (`AVAssetExportSession`, medium quality) | PARTIAL — unverified on device | same |
| Transcription | `SpeechTranscriptionService` + `LiveTranscriber` (`SFSpeechRecognizer`, on-device when supported) | PARTIAL — real; a failure fails the processing job, never substitutes a transcript | DEMO — `MockTranscriptionService` (the boiler transcript) |
| AI analysis | `ProcessingPipeline` + `MomentDetector` → `AnalysisBackedGenerationService` (validator + mapper) over `GatewayProcedureAnalysisService` (`POST /v1/analyze`, retries, idempotency key) | PARTIAL with `DoOnceGatewayURL`; **BLOCKED** without one: `UnconfiguredProcedureAnalysisService` throws `GatewayError.notConfigured` and Teach says so | DEMO — `DeterministicProcedureAnalysisService` (the assembler; no language model) |
| Object recognition | `VisionRecognitionService` (feature prints + saliency) + `LiveRecogniser` + `RecognitionMatcher` | PARTIAL — a first approximation of "my boiler vs a boiler" | DEMO — `MockObjectRecognitionService` |
| Authentication | `AppleSignInService` + `KeychainSessionStore` (`kSecClassGenericPassword`, service `app.doonce.session`, after first unlock) | PARTIAL — real session; `deleteAccount` calls `DELETE /v1/account` (BLOCKED without a gateway); email sign-in has no backend | DEMO — `MockAuthService` + `FileSessionStore` |
| Subscriptions | `StoreKitSubscriptionService` (`Product.products`, `purchase`, `AppStore.sync`, `Transaction.currentEntitlements`, `Transaction.updates` listener) | PARTIAL with `DoOnceProductIDs`; BLOCKED without (paywall shows "not available yet") | DEMO — `MockSubscriptionService` (free = 5 memories) |
| Upload | `BackgroundUploadTransport` (background `URLSession`, resumable, never deletes the local file) | PARTIAL — no endpoint configured (`DoOnceUploadEndpoint`); uploads stay pending | same |
| Haptics | `HapticsService` (UIKit generators + Core Haptics patterns, Full/Reduced/Off) | DONE | DONE |
| Analytics | `InMemoryAnalytics` behind `Analytics` | DEMO — no backend; events carry no content | DEMO |
| Question answering | `TranscriptGroundedAnswerer` | DONE (local) | DONE |

## Service modes

`DoOnceCore.ServiceConfiguration.resolve(environment:info:)` runs once in `AppState.init`.
Environment variables win over Info.plist keys, so a scheme can override a build.

| Setting | Info.plist key (`project.yml` → `targets.DoOnce.info.properties`) | Environment override | Shipped default |
|---|---|---|---|
| Mode | `DoOnceServiceMode` (`demo` / `live`) | `DOONCE_SERVICE_MODE` | `demo` until a gateway exists; unset with a gateway URL means `live` |
| Gateway | `DoOnceGatewayURL` (base URL; `/v1/analyze`, `/v1/account`) | `DOONCE_GATEWAY_URL` | empty |
| Products | `DoOnceProductIDs` (array of App Store product IDs) | — | `[]` |
| Upload | `DoOnceUploadEndpoint` | `DOONCE_UPLOAD_ENDPOINT` | empty |
| Sample content | — | `DOONCE_SAMPLE_CONTENT` (`1`/`0`; the scheme sets `1`) | on in demo, off in live |

**Demo** (default): `FileStore` persistence, sample household seeded once into an empty store,
mock transcription / recognition / auth / subscription, deterministic analysis. Everything works
offline and on the simulator; the paywall says "Demo" on its prices.

**Live path**: set `DoOnceServiceMode: live`, `DoOnceGatewayURL`, `DoOnceProductIDs`, add the Sign in
with Apple capability and StoreKit products. Then transcription is on-device Speech, recognition
is Vision, analysis goes to the gateway, sign-in is Apple with the session in the Keychain, and
purchases are StoreKit 2. Without a gateway URL, live mode is honest: Teach stops at "Understanding"
with a clear message and Settings → Services shows the service as not configured. Live mode never
falls back to the deterministic assembler.

`ServiceStatusEntry.table(for:storageOnDisk:)` derives the Settings → Services page from the same
configuration, so the labels there are the wiring, not a hope.

## Native visual QA (CI screenshot walk)

`.github/workflows/doonce-ios.yml` runs `DoOnceUITests` in both appearances and exports a
screenshot of every major surface (launch, onboarding, Memory, the centre bloom, Look, Teach,
object passport, procedure detail, Do mode, Ask, completion, You, paywall, Settings, Services,
Privacy, search) as a CI artifact — the first time the real SwiftUI implementation, not the HTML
prototype, has been seen rendered. Reviewing it against the approved design found and fixed:

- **Photo cards sizing to their image instead of their frame.** `MediaView` aspect-filled without
  a bound, so inside the "Recently around you" horizontal scroll (an unbounded proposal) each
  object card grew to its photo's own size and bled off both edges. Fixed by having the view take
  the size it is offered and overlay the image inside it (`MediaView.swift`).
- **The floating tab bar covering a pushed page's own action.** The prototype mounts the tab bar
  only on the two root pages; the native shell kept it visible everywhere, so it sat on top of the
  procedure page's Start button. The tab bar now shows only at `Router.isAtRoot` and slides away
  on push (`MainView.swift`, `Router.swift`).
- **A stray sheet behind the camera's own error state.** Look additionally raised its recognition
  error sheet when the camera itself had failed to start, duplicating the camera surface's own
  "The camera couldn't start" notice. The surface's own message is now the only one
  (`LookView.swift`).
- **A self-taught memory's grounded answer read "Me didn't say anything about that."** The
  household represents the current user as a Person named "Me" (for "Taught by Me" rows); three
  call sites (`AskSheet`, `StepBody`, `SeeOriginalView`) passed that raw record into the natural-
  language answerer instead of resolving it the way `TaughtByLine` already did
  (`AppState.demonstratorName`: self → the current user's real display name). All three now go
  through the same resolution, so the answer reads "Amine didn't say anything about that."
- **A UI-test-only bug**, not a product one: the light and dark appearance passes share one
  simulator and installed app; without a reinstall between them, the second pass inherited the
  first pass's already-completed golden-path memory and found no "Continue" card. `ci.sh` now
  reinstalls the built app fresh before each appearance's test run.

No other regressions were found: onboarding, the object passport, procedure detail, Do mode,
completion, paywall, Settings/Services/Privacy and search all matched the approved design in both
light and dark, materials and dark-mode contrast included.

## What a real backend adds

Storage sync (household), transcription at scale, language-model procedure generation grounded on
the transcript, a learned object embedding trained on the household's confirmations, StoreKit
products, Sign in with Apple verification, share links and QR handoff. Every one of these has a
protocol and a call site already.

## Known device-level risks to verify first in Xcode

- Sample-content objects carry 16-dimension mock embeddings, while Look embeds camera frames with
  Vision feature prints, so the seeded boiler can never be recognised live. Objects taught or added
  on the device get real embeddings and are the true golden path. `RecognitionMatcher` thresholds
  (0.85 exact / 0.6 category) were tuned on the mock and will need tuning against feature prints.
- On some devices `AVCaptureVideoDataOutput` / `AVCaptureAudioDataOutput` pause while
  `AVCaptureMovieFileOutput` records, which would silence live captions and the breathing ring
  during Teach. If it shows, the fix is an `AVAssetWriter` recorder fed from the data outputs.
- Server-based Speech (devices without on-device recognition) caps requests at about a minute;
  `SpeechTranscriptionService` documents the chunking needed.
- Presenting a sheet from inside a full-screen cover goes through `router.coverSheet`; confirm the
  permission and paywall sheets appear over Teach and Look.

## App identity (Phase 3)

| Field | Value |
|---|---|
| Bundle ID (app) | `app.doonce.ios` |
| Bundle ID (widget extension) | `app.doonce.ios.widgets` |
| App Group | `group.app.doonce` |
| Display name | DoOnce |
| Marketing version | `MARKETING_VERSION` in `project.yml`, currently `1.0.0` — bump deliberately, never automatically |
| Build number | `CURRENT_PROJECT_VERSION`; the TestFlight workflow overrides it with the CI run number, so every upload is unique and always higher than the last one Apple received |
| Entitlements | `com.apple.security.application-groups` (the widget's Continue store and Live Activity share data with the app), `com.apple.developer.applesignin` (the app calls `ASAuthorizationAppleIDProvider`; this was missing before Phase 3 — a real signed build would have been provisioned without the capability and Sign in with Apple would have failed on device) |
| Capabilities deliberately not enabled | Push Notifications (only *local* notifications are used — `UNUserNotificationCenter`, no APNs/remote registration), Associated Domains (no universal links), a Keychain access group (the session is app-only, no sharing with the extension) |

`Info.plist`'s `CFBundleShortVersionString`/`CFBundleVersion` reference `$(MARKETING_VERSION)`/
`$(CURRENT_PROJECT_VERSION)` rather than hardcoded strings, so Xcode substitutes them at build
time and the TestFlight workflow can override just the build number per run without editing the
project.

## TestFlight release pipeline

`.github/workflows/doonce-testflight.yml` — manual dispatch only (Actions tab → "DoOnce —
TestFlight release" → Run workflow). It never runs on an ordinary push; `doonce-ios.yml` (unsigned,
simulator, every push) is unchanged. On dispatch it, on a macOS runner:

1. generates the Xcode project (`ci.sh generate`, the same step normal CI uses);
2. builds a real, signed Release archive (`xcodebuild archive`) using automatic signing driven by
   the App Store Connect API key (`-allowProvisioningUpdates -authenticationKeyPath/-ID/-IssuerID`
   — no Apple ID password, no interactive 2FA, ever);
3. verifies the archive's own bundle id, version, build number and signing team before trusting it;
4. exports a real App Store IPA locally and verifies its identity again (a distinct check — export
   success is never assumed from archive success);
5. uploads it to App Store Connect (`xcodebuild -exportArchive` with `destination: upload`);
6. finds or creates the DoOnce app record in App Store Connect (`doonce/ios/appstoreconnect.py`,
   the same API key, JWT-authenticated — no separate login);
7. polls App Store Connect until Apple finishes processing the build (`VALID`, not just "upload
   returned success") or reports why it didn't;
8. attaches the processed build to an Internal Testing group, adding every App Store Connect user
   on the team it can see as a tester.

### Required repository secrets

None of these are committed, logged, or written anywhere outside a runner-local temp file this
same workflow job deletes when it finishes. Add them at **GitHub → this repository → Settings →
Secrets and variables → Actions → New repository secret**:

| Secret | What it is | Where to get it |
|---|---|---|
| `APPLE_TEAM_ID` | The Apple Developer Program team ID (10 characters) | [developer.apple.com/account](https://developer.apple.com/account) → Membership |
| `ASC_KEY_ID` | App Store Connect API key ID | [appstoreconnect.apple.com/access/api](https://appstoreconnect.apple.com/access/api) → Keys → Team Keys → **Generate API Key** (name it, role **Admin** — App Store export uses Apple's cloud-managed distribution certificate, which App Manager keys are refused with "Cloud signing permission error") |
| `ASC_ISSUER_ID` | App Store Connect API issuer ID | Same page, shown above the key list |
| `ASC_PRIVATE_KEY` | The full contents of the downloaded `AuthKey_<ASC_KEY_ID>.p8` file, pasted verbatim (including the `-----BEGIN/END PRIVATE KEY-----` lines) | Downloaded once, when the key is generated — Apple does not let you download it again, so save it somewhere safe before leaving that page |

Generating the API key is the only click-through Apple requires; everything after that (signing,
archiving, exporting, uploading, waiting for processing, enabling Internal Testing) is automatic.

### What is genuinely untested

None of the App Store Connect API calls in `appstoreconnect.py` have been exercised against Apple's
real API — this environment has no Apple credentials and no macOS. The JWT it signs was verified
independently (a real OpenSSL-generated P-256 key/signature round-tripped correctly through the
DER→raw conversion the ES256 JWT format requires, and the resulting token's header/payload/
signature shape matches Apple's documented format exactly), and the `xcodebuild`/security/PlistBuddy
commands follow Apple's current documented flags, but the first real dispatch of this workflow is
the first real test of the whole chain end to end. If the App Store Connect app-creation call
(`POST /v1/apps`) needs a field Apple's API has since renamed, the workflow fails loudly with
Apple's own error body rather than silently misbehaving — never a false "success."

## Credentials and configuration still required

- App Store Connect API credentials for the TestFlight pipeline above (`APPLE_TEAM_ID`,
  `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY` as GitHub repository secrets) — this is the one
  blocker between the current state and a real device install.
- `DoOnceGatewayURL`, `DoOnceProductIDs`, `DoOnceUploadEndpoint` (Info.plist) — see "Service modes".
  None of these block getting a build onto a physical iPhone; they gate live AI, live pricing and
  cloud sync respectively, all independent of TestFlight distribution.
- Nothing is committed that resembles a secret; the device session lives in the Keychain.
