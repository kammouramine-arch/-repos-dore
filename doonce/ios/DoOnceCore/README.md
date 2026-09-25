# DoOnceCore

The platform-independent core of DoOnce: models, domain logic, service protocols and sample content. Foundation only, no UIKit, SwiftUI, AVFoundation or Vision, so it builds and tests on Linux and inside Xcode alike. Swift 6 language mode with strict concurrency; every type is `Sendable`, every stateful service is an `actor`.

```
Sources/DoOnceCore/
  Models/         Memory, Step, PhysicalObject, Person, Space, Recording, Transcript, Analysis, ...
  Domain/         ProcedureAssembler, SearchIndex, RecognitionMatcher, FreshnessPolicy,
                  VoiceCommandParser, MemoryVersioning, and the text heuristics they share
  Services/       Repository and service protocols, in-memory actors, upload, auth,
                  subscription gating, haptics policy, analytics events, Localization,
                  ServiceConfiguration (live/demo resolution), AuthSession + SessionStore
    Persistence/  FileStore (one atomic store.json), FileSessionStore, ProgressStore,
                  ProcessingJobStore
    Media/        MediaLibrary: where originals, frames, clips and thumbnails live on disk
    Analysis/     The AI contract: ProcedureAnalysisRequest/Response, AnalysisValidator,
                  MemoryMapper, the deterministic and gateway providers, HTTPTransport
  SampleContent/  SampleData: the "Home" household with boiler, espresso machine, Julien and Dad
  Mocks/          Mock transcription, procedure generation and object recognition
  Resources/      strings.json, copied from design/copy (source of truth)
Tests/DoOnceCoreTests/   XCTest
```

## Build and test

Linux (Swift 6.1 toolchain):

```sh
cd doonce/ios/DoOnceCore
swift build
swift test
```

Xcode: open the `DoOnceCore` folder as a package, or add it as a local package dependency of the app target and `import DoOnceCore`. Tests run with Cmd-U.

## The observed-vs-inferred rule

A generated step exists only where the recording supports it. `ProcedureAssembler` creates one step per detected moment (a "Remember this" tap, a change in what the hands are doing) and fills it with the words spoken in that window. Every step keeps `sourceRange` and `sourceTranscript`, so "See original" can always jump to the exact clip.

- `.observed`: a moment that was seen or marked, with matching speech.
- `.inferred`: a boundary guessed from speech alone (a pause, a "next") or, when there are no moments at all, a transcript segment that reads as an instruction.
- `.unclear`: a moment with no usable speech. Shown as "This part wasn't clearly captured." rather than filled in.

The assembler never adds a step beyond those moments and never rewrites what was said; it only tidies the instruction sentence (drops "so", "okay", capitalises, adds a full stop). Warnings come from important statements the demonstrator actually made ("never", "always", "careful", "remember", "important") and completion rules only from spoken values ("stop when it reaches 1.5 bar").

## Persistence

`FileStore` keeps the whole household as one `MemoryStoreSnapshot` in `store.json`, wrapped in a
`StoreDocument` with a `schemaVersion`. Every mutation writes the complete document to a temporary
sibling and renames it into place, so the file on disk is always valid. Dates are ISO-8601, keys
are sorted, so backups diff cleanly. A document from a newer schema is refused (`incompatibleSchema`);
a corrupt one is moved to `store.corrupt-<timestamp>.json` and the store starts empty. The device
session lives apart in `session.json` (`FileSessionStore`), never in the household document.
`ProcessingJob` records where each recording is in the pipeline so processing resumes after a kill.

## Media rules

`MediaLibrary` owns the layout under one directory per recording: `original.mov`, `thumbnail.jpg`,
`frames/00022.500.jpg`, `clips/step-03.mp4`. Originals are never duplicated; frames, clips and
thumbnails are disposable (`purgeDerived`); the original goes only on explicit user deletion, and
when its upload is not confirmed only with `force`.

## The AI contract

Every provider (`GatewayProcedureAnalysisService`, `DeterministicProcedureAnalysisService`, or
an on-device model later) answers a `ProcedureAnalysisRequest` with a `ProcedureAnalysisResponse`,
camelCase JSON with ISO-8601 dates. Nothing a provider says reaches the user until
`AnalysisValidator` has run: it clamps source ranges into the recording, marks steps without speech
behind them as inferred, turns low-confidence or empty steps into "This part wasn't clearly
captured.", flags numbers nobody said, never lets the risk level fall below what `RiskClassifier`
reads in the words, and never allows more steps than moments plus transcript segments.
`MemoryMapper` then produces the `Memory`; `AnalysisBackedGenerationService` runs the three in order.
The gateway client retries 5xx, timeouts and dropped connections with an idempotency key, and
treats 4xx as final. `ServiceConfiguration.resolve` picks live or demo mode from the environment,
the Info.plist, or the presence of a gateway URL.

## Analytics and privacy

`AnalyticsEvent` covers the funnel (install, first teach, first memory, first Look recognition, first Do completion, processing latency, camera and upload failures, recognition corrections, share, subscription conversion). Events carry counts, durations and coarse reasons only. No recording content, transcript text, object names, people or media ever appear in an analytics payload, and this package has no network code that could send them.

## Copy

`Resources/strings.json` is a copy of `design/copy/strings.json`. Re-copy it when the source changes. `Localization` supports `{name}` placeholders, `one`/`other`/`zero` plural forms and language fallback (`fr` → `en`).
