# DoOnce iOS — what is real, what is simulated

Every service sits behind a protocol from `DoOnceCore`; `AppState.Services` wires the defaults.
Views never know which implementation they talk to. Swap a mock for a live service in
`AppState.init` and nothing else changes.

Legend: **DONE** real and reviewed · **PARTIAL** real but incomplete or unverified on device ·
**DEMO** stands in for a real service · **BLOCKED** needs macOS/Xcode, a device or credentials.

## Verification in this environment

| Check | Result |
|---|---|
| `DoOnceCore` — `swift build` + `swift test` (Linux, Swift 6.1, language mode 6) | DONE — 80 tests, 0 failures |
| App, widgets, tests — `swiftc -parse` on every file (128 files, 11 k lines) | DONE — no syntax errors |
| App — type-check, Xcode build, simulator, device | BLOCKED — no macOS/Xcode here; expect a round of compile fixes on first Xcode build |
| Visual review | DONE for the prototype (106 captures, two passes); the native app is reviewed by inspection only |

## Product surfaces

| Surface | Status | Notes |
|---|---|---|
| Launch (logo forms, echo, skip, Reduce Motion) | DONE | `LaunchView`, Core Haptics loop-close pattern |
| Onboarding 1–4 + auth page | DONE | Live demos in scenes 2–4 are local animations (not the camera) |
| Sign in with Apple | DEMO | `SignInWithAppleButton` is shown; the result is not verified against a backend, onboarding always continues |
| First-use introduction | DONE | Hosts its own presenters; enters the shell after the first save |
| Memory home, timeline, search | DONE | Search is `DoOnceCore.SearchIndex`, real ranking over local data |
| Object passport, procedure detail | DONE | Rename / move / delete write through the repositories |
| Centre action bloom → Look / Teach / Add | DONE | |
| Look: camera, recognition sequence, sheets | PARTIAL | Camera and Vision are real; recognition quality depends on feature prints (see Services) |
| Teach: pre-record, recording, markers, live captions, chips, ribbon, stop | PARTIAL | Real AVFoundation + Speech; unverified on device |
| Import a video | PARTIAL | `PHPickerViewController`; the imported file becomes a Recording |
| Processing (staged reveal from real pipeline stages) | DONE | No invented percentages; retry re-runs the pipeline |
| Review / edit (reorder, split, combine, remove, warning, replace frame, rename) | DONE | Edits of a saved memory go through `MemoryVersioning` |
| Object creation (suggest / correct / edit / generic, spaces) | DONE | Embeds reference images with Vision |
| Save moment (memory absorbed by the object) | DONE | Core Haptics settle pattern |
| Do mode (one step per screen, swipe, progress, warnings, provenance) | DONE | Progress persisted as `MemoryProgress` |
| Hands-free (voice intents, spoken steps) | PARTIAL | Real `SFSpeechRecognizer` + `AVSpeechSynthesizer`; unverified on device |
| Automatic step completion ("Looks good — 1.5 bar") | DEMO | `GaugeCompletionMonitor` fires on a timer; the Vision gauge reader is not written |
| Ask within memory | DONE | `TranscriptGroundedAnswerer`: local, cites a timestamp, never invents |
| See original | PARTIAL | Plays the local recording at the exact time when the file exists; key-frame fallback otherwise |
| Completion (loop resolves, accuracy question) | DONE | |
| Spaces, people, household, share, QR import, notifications | PARTIAL | Local only; share links point at a placeholder domain, QR scanning is a placeholder frame |
| Profile, settings, privacy, haptics, subscription, paywall | PARTIAL | Paywall purchase is `MockSubscriptionService`; prices are placeholders |
| Permission education → system prompt | DONE | Contextual, never at launch |
| Offline banner, error states, empty states | DONE | |
| Live Activity + Continue widget | PARTIAL | Written against ActivityKit/WidgetKit; needs the app group entitlement and a device |

## Services

| Service | Implementation | Status |
|---|---|---|
| Camera | `CameraSession` / `CaptureEngine` (AVFoundation, 1080p, torch, focus, interruption + background recovery, first-frame gate) | PARTIAL — real, unverified on device |
| Recording | `MovieRecorder` (movie output, storage guard, audio metering, markers, key frames via `AVAssetImageGenerator`) | PARTIAL — real, unverified on device |
| Transcription | `SpeechTranscriptionService` + `LiveTranscriber` (`SFSpeechRecognizer`, on-device when supported) | PARTIAL — real; **default wiring uses `MockTranscriptionService`** (the boiler transcript) so sample content works without a microphone. Switch in `AppState.init`. |
| AI analysis | `ProcessingPipeline` + `MomentDetector` (pauses, markers, important statements) + `DoOnceCore.ProcedureAssembler` via `MockProcedureGenerationService` | DEMO for generation quality — deterministic heuristics, no language model; provenance and observed/inferred/unclear are real |
| Object recognition | `VisionRecognitionService` (feature prints + saliency) + `LiveRecogniser` (2-hit rule, category/unknown after 2.5 s) + `DoOnceCore.RecognitionMatcher` | PARTIAL — real but a first approximation of "my boiler vs a boiler"; **default wiring uses `MockObjectRecognitionService`** for sample content |
| Storage | `InMemory*` repositories seeded from `SampleData` | DEMO — no persistence across launches yet (SwiftData/CloudKit boundary is the repository protocols) |
| Upload | `BackgroundUploadTransport` (background `URLSession`, resumable, never deletes the local file) | PARTIAL — no endpoint configured (`DoOnceUploadEndpoint` in Info.plist); uploads stay pending |
| Authentication | `MockAuthService` | DEMO |
| Subscriptions | `MockSubscriptionService` (free = 5 memories) | DEMO — StoreKit not integrated |
| Haptics | `HapticsService` (UIKit generators + Core Haptics patterns, Full/Reduced/Off) | DONE |
| Analytics | `InMemoryAnalytics` behind `Analytics` | DEMO — no backend; events carry no content |
| Question answering | `TranscriptGroundedAnswerer` | DONE (local); `LLMQuestionAnswerer` is a stub that must stay grounded and cite a timestamp |

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
- `DoOnceUploadEndpoint` (Info.plist) for uploads.
- Nothing is committed that resembles a secret.
