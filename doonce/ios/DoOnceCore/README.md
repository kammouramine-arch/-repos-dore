# DoOnceCore

The platform-independent core of DoOnce: models, domain logic, service protocols and sample content. Foundation only, no UIKit, SwiftUI, AVFoundation or Vision, so it builds and tests on Linux and inside Xcode alike. Swift 6 language mode with strict concurrency; every type is `Sendable`, every stateful service is an `actor`.

```
Sources/DoOnceCore/
  Models/         Memory, Step, PhysicalObject, Person, Space, Recording, Transcript, Analysis, ...
  Domain/         ProcedureAssembler, SearchIndex, RecognitionMatcher, FreshnessPolicy,
                  VoiceCommandParser, MemoryVersioning, and the text heuristics they share
  Services/       Repository and service protocols, in-memory actors, upload, auth,
                  subscription gating, haptics policy, analytics events, Localization
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

## Analytics and privacy

`AnalyticsEvent` covers the funnel (install, first teach, first memory, first Look recognition, first Do completion, processing latency, camera and upload failures, recognition corrections, share, subscription conversion). Events carry counts, durations and coarse reasons only. No recording content, transcript text, object names, people or media ever appear in an analytics payload, and this package has no network code that could send them.

## Copy

`Resources/strings.json` is a copy of `design/copy/strings.json`. Re-copy it when the source changes. `Localization` supports `{name}` placeholders, `one`/`other`/`zero` plural forms and language fallback (`fr` → `en`).
