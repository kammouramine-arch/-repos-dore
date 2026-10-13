# Avyro V2 development validation

This branch is a development candidate, not a completed production release.

## Implemented

- Native foreground keyword spotting with sherpa-onnx 1.13.8 and the English
  GigaSpeech 3.3M model. Literal `HEY AVYRO` is encoded using the model's BPE
  tokenizer. No Porcupine dependency, access key or paid wake contract.
- Native microphone release is awaited before opening command recognition.
  Backgrounding, audio interruption and audio route changes stop capture.
- Home and Work can be selected, saved, edited and navigated to. New records
  use device secure storage. Earlier unencrypted records need migration before
  a production release.
- Address searches require submission, rather than public Nominatim autocomplete.
- Preference for installed enhanced platform voices; falls back to the available
  system voice. No voice download or paid voice API is started.
- Driving-safety and missing road-data questions have deterministic guarded replies.
- Server-owned AI classification, authenticated opaque sessions with hashed token
  persistence, scrypt passwords, request deadlines and rate limits.
- Incident backend accepts categorized, recent observations with consent. Reports
  are pending until a server-authorized moderator approves them. Public observations
  omit reporter identity, use rounded coordinates and expire after one hour.

## Licence evidence, inspected 2026-10-13

Engine: Apache 2.0, https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.8/LICENSE

Model: `sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01` official archive
contains `README.md` with `license: Apache License 2.0`. The original model card
is preserved next to the bundled weights. Source archive SHA256:
`f170013b4716e41b62b9bfd809687c207cef798ef9bc6534d524e17af9b6561a`.

The publisher's 2026-10-08 Apache 2.0 clarification is recorded at
https://github.com/k2-fsa/sherpa-onnx/issues/3802#issuecomment-6052663364
(use the issue's Oct 8 author comment if the comment anchor changes).
The licence marking permits commercial redistribution subject to Apache notices;
it does not constitute an independent audit of the training corpus rights.
No bilingual-model lexicon is included.

Runtime: ONNX Runtime, MIT licence, https://github.com/microsoft/onnxruntime/blob/main/LICENSE.
Binary dependencies are pinned to upstream manifest SHA256s in `prepare-wake.mjs`.

Search: OpenStreetMap attribution is visible in search. The public endpoint
prohibits autocomplete, has a maximum one request/second and requires caching
and identification: https://operations.osmfoundation.org/policies/nominatim/.
Use a licensed production geocoder and router before broad distribution.
OSRM demo has no production availability guarantee.

## Remaining release gates

- Native compile and signed build results must be recorded after the builders finish.
- Actual wake accuracy, false activations, audio interruption recovery, immediate
  trailing commands, vehicle noise, Bluetooth, CPU, memory and battery need physical
  iPhone testing. Wake detection is foreground-only. Do not promise Siri behavior.
- No licensed speed-limit, road-sign, traffic or official hazard feed is configured.
  Missing data is stated; none is fabricated or inferred from GPS speed.
- Backend is executable locally and tested, but not deployed. No hosted identity,
  AI billing, public incident feed or moderator operation is live. Email verification,
  password reset, account deletion and persistent distributed abuse limits are
  required before public registration.
- The incident backend is not yet a complete driver-facing report workflow.
- Natural voice quality depends on voices installed on the iPhone.
- App Store publication and any new paid infrastructure require user approval.

## Validation commands

`npm run typecheck`, `npm run lint`, `npm test -- --ci --runInBand`,
`npm --prefix backend test`, `npx expo-doctor`.

The native iOS workflow builds an unsigned Release simulator app. A simulator ZIP
cannot be installed on an iPhone and must never be presented as a phone artifact.
EAS production produces a signed App Store IPA; TestFlight requires a successful
submission, Apple processing and tester access before the user can install it.
