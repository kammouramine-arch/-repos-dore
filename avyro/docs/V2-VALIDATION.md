# Avyro V2 development validation

This branch is a development candidate, not a completed production release.

## Implemented

- Native foreground keyword spotting with sherpa-onnx 1.13.8 and the English
  GigaSpeech 3.3M model. Literal `HEY AVYRO` is encoded using the model's BPE
  tokenizer, with pronunciation variants AVIRO, AVEERO and A VEE RO.
  No Porcupine dependency, access key or paid wake contract.
- Native microphone release is awaited before opening command recognition.
  Backgrounding, audio interruption and audio route changes stop capture.
- Home and Work can be selected, saved, edited and navigated to. New records
  use device secure storage. Earlier unencrypted records migrate before loading.
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

- Native signed device Release and unsigned simulator Release builds passed for
  candidate commit `ca834a1e11491995fa8bd22ed21472f99c16b0f2`.
- Actual wake accuracy, false activations, audio interruption recovery, immediate
  trailing commands, vehicle noise, Bluetooth, CPU, memory and battery need physical
  iPhone testing. Wake detection is foreground-only. Do not promise Siri behavior.
- No licensed speed-limit, road-sign, traffic or official hazard feed is configured.
  Missing data is stated; none is fabricated or inferred from GPS speed.
- Backend is executable locally and tested, but not deployed. No hosted identity,
  AI billing, public incident feed or moderator operation is live. Email verification,
  password reset, account deletion and persistent distributed abuse limits are
  required before public registration.
- The report control checks a fresh stationary GPS fix and requests consent.
  The hosted service and real moderation operations still need deployment.
- Natural voice quality depends on voices installed on the iPhone.
- App Store publication and any new paid infrastructure require user approval.

## Validation commands

Local native-model smoke test: three synthesized pronunciation variants trigger
HEY_AVYRO; five negative clips (normal directions, Siri, Google, “a hero” and
“a viral”) do not. These eight clips are insufficient to measure accuracy,
false-activation rate or road-noise robustness. The literal spelling spoken by
Windows TTS was pronounced differently and initially missed; physical user
pronunciations remain a release gate. KWS score 5, threshold 0.1, one trailing
blank are candidate tuning values, not a validated reliability claim.

`npm run typecheck`, `npm run lint`, `npm test -- --ci --runInBand`,
`npm --prefix backend test`, `npx expo-doctor`.

The native iOS workflow builds an unsigned Release simulator app. A simulator ZIP
cannot be installed on an iPhone and must never be presented as a phone artifact.
EAS production produces a signed App Store IPA; TestFlight requires a successful
submission, Apple processing and tester access before the user can install it.

## Delivered internal beta, 2026-10-13

Version 1.0.0 (25), EAS build `c370befb-7e66-46b4-a084-d366683c9f08`,
submission `7f292351-c15f-4f53-8456-b91b1cda7254`: Apple reports processing
`VALID`, internal state `IN_BETA_TESTING`. Existing internal testers can update
through TestFlight. No public App Store release or new tester invitations were made.
The signed IPA contains all nine expected model, token, keyword and licence files,
whose hashes match the committed resources.

Validation: 419 app tests in 30 suites; six backend integration tests;
typecheck and lint passed; Expo Doctor 21/21 passed. GitHub simulator workflow
run 38457829108 completed successfully. No physical iPhone or vehicle test has
been performed. EAS account remained on Free with recorded build cost zero.
Development ran locally and on native build services; the available ChatGPT
website browser was signed out, so this was not executed inside cloud Work.

This is a testable foundation beta, not a claim that the remaining production
release gates above have been satisfied.
