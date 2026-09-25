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
| App, widgets, tests — `swiftc -parse` on every file (136 files) | DONE — no syntax errors |
| App — type-check, Xcode build, simulator, device, TestFlight | BLOCKED — no macOS/Xcode here; expect a round of compile fixes on first Xcode build. Nothing hardware-dependent is verified |
| Visual review | DONE for the prototype (106 captures, two passes); the native app is reviewed by inspection only |

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

## Credentials and configuration still required

- Apple developer team for signing (`DEVELOPMENT_TEAM` in `project.yml`), App Groups capability
  `group.app.doonce`, Sign in with Apple capability, Live Activities.
- `DoOnceGatewayURL`, `DoOnceProductIDs`, `DoOnceUploadEndpoint` (Info.plist) — see "Service modes".
- Nothing is committed that resembles a secret; the device session lives in the Keychain.
