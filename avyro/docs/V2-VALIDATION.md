# Avyro V2 development validation

This branch is a development candidate, not a completed production release.

## October 15 additional visual feedback

Reviewed the supplied SUPJ6093, WYVM2675 and RKZS9242 recordings and three desktop
screenshots of the native preview. The trip panel now animates only its own
surface; its full-screen dimming layer stays fixed, avoiding a sliding tinted
rectangle across the map. Its height remains stable while route results load.
Dismissal and subsequent navigation are sequenced, swipe dismissal supplies a
selection haptic, and opening/closing respects system Reduced Motion. Alternative
routes are keyed to the current destination/stops, so results from a different
trip cannot remain actionable.

The map puck is an original vector open roadster with a seated companion and a
subtle blink, retaining route-vertex motion and camera-relative bearing. No Waze
artwork/code is used. Crossing a grounded limit produces three brief sign pulses;
GPS digits stay red for the entire excess and return to white below the limit.
The instrument layout stays fixed, without an expanding repeated warning pill.
This revision requires new native visual validation and a replacement signed IPA.
## October 15 build 39 candidate: driving recording review

Reviewed LGZA8479, SUPJ6093 and RKZS9242 driving/UI recordings, and the NODU6018
and PWMP5299 visual references. MHZI5176 contains only a 74×160 preview frame,
not a playable recording. Private tester footage remains outside the repository.

Hosted route planning now uses the existing TomTom key through authenticated
`POST /routes`; connected clients no longer use the OSRM public demo. The server
pins car routing, bounds waypoints/response size/time, normalizes provider turn
instructions and reserves a separate 1,000-request monthly route test allowance.
The phone never receives the key. Live synthetic route checks succeeded in
France, Morocco and India; these samples do not prove universal road coverage.

Maneuvers use supplied geometry/coordinate anchors instead of globally rescaled
step lengths. Road matching considers recent physically plausible progress and
course near parallel/opposite approaches. The puck interpolates through curve
vertices rather than drawing a straight chord across a bend, uses actual camera
heading, and does not remain forcibly snapped when well off the planned route.
Uncertain/off-route positions withhold the old turn banner and voice prompts.
An endpoint projection alone can no longer announce arrival far from the route.

Sourced lookahead road sections can retain speed limits between network requests
while fresh accurate GPS matches that section and direction. Conflicting nearby
limits, expired source evidence, turns and poor GPS are rejected. Street-name
variants Lindbergh and Blériot now match their scoped Wattignies correction;
the municipality's own school address confirms the shortened Lindbergh form:
https://www.wattignies.fr/index.php
No universal 30 km/h fallback is introduced. Accurate repeated stationary fixes
can resolve CoreLocation's unknown speed to zero; missing GPS cannot.

iPhone panels/controls use tinted native blur, the trip details touch area fills
the information region, and its sheet has a drag-to-dismiss gesture and outside
tap dismissal. The roundabout glyph is redrawn; sign markers/notices enter with
brief motion, opposite-approach metadata is rejected and near-duplicate pins are
collapsed. The traffic-light illustration shows all three conventional colours
together; it never represents a current live phase. The unknown-limit pill is
removed, with unavailable evidence retained in spoken/accessibility responses.
TomTom attribution remains visible at a smaller size. Avyro's own animated edge
light indicates listening/thinking/replying; no Siri assets/code are used.

507 app tests in 47 suites, typecheck and lint pass. 30 backend and 18 Cloudflare
tests pass, including route authentication and disabled-provider behavior.
Native run 38732327312 passed guest entry, reports, nearby search, route preview, continuous stationary zero, trip details and swipe dismissal. Its last stop assertion selected a parking place only 20 m away, within the existing 50 m stop-arrival radius, so the stop immediately completed. A focused native rerun selects a farther parking place to validate retaining a pending stop. Final stop validation and Apple TestFlight availability remain pending.
Physical accuracy on the tester's roads and in-car French/English voice still
require device testing. No ElevenLabs account, paid voice or paid plan is activated.

## October 15 build 38 internal TestFlight release

Source `8163534bef38cb177776a8ffa4d7337c08e7413b` passes 495 app tests in 43
suites, TypeScript and lint; 24 gateway tests and 17 Cloudflare tests also pass.
Cloud HTTP tests run against local workerd/D1 with road and AI flags disabled.
Clear local test rate buckets before rerunning the suite; otherwise repeated
runs correctly hit the persisted guest/report limits. Never clear production
rate buckets for tests.

The normal first-use invitation enables bounded cloud command transcription,
intent classification and road information after disclosure, with an offline-only
alternative. Ambient wake processing remains on-device and foreground-only.
The bundled supported wake phrase is "Hey Avyro" for French and English commands.
English synthetic command samples passed live Whisper checks; real French and
car-cabin accuracy still require device validation.

Native MapKit searches now prioritize locally matching named branches and use
bounded POI categories for fuel, food and parking, sorting before limiting results.
Full numbered addresses remain strict. Guidance starts in 3D where Apple supplies
buildings, includes a destination flag, and opens trip details from the bottom bar.
Trip details retain the destination when adding up to three stops, show returned
route alternatives and nearby unverified community observations. Best-departure
prediction and provider live traffic are not implemented.

Structured new-client reports appear immediately for one hour as unverified
community observations. Older clients still see approved reports only. No staffed
human review operation is claimed. A valid location is required; speed and an
assumed parked state no longer gate reporting. Anonymous sessions can continue
in memory if keychain writes temporarily fail, without plaintext persistence.

Mapped ahead warnings include source-positioned stop/yield signs, neutral traffic
lights, limited-access/ramp transitions and numbered roads. The route-ahead API
and physical-trace limit API share the 1,000-request monthly evaluation cap.
Missing/uncertain/expired data is unavailable, never a safe-road assurance.
Live verification on a documentation-coordinate route in the Netherlands returned
a traffic-light marker at 4.6141947806,52.3802402616. Unit fixtures also exercise
sign chainage and rejecting off-route/malformed metadata. This does not establish
complete worldwide sign coverage.

The signed Wattignies municipal order 23-405, dated 2023-03-24, was checked on
both rendered PDF pages. Its named roads carry a scoped 30 km/h correction until
2027-01-13 review; lower mapped limits stay lower. A live synthetic physical-trace
check on Avenue Denis Cordonnier returned the 30 correction where upstream mapped
evidence says 50. Low-confidence synthetic movement was correctly rejected.
Source: https://api-politique.pappers.fr/territoire/document/d994d3ace92aad23202ec2c6ffa383de/pdf
No country-wide 30 default or correction of every worldwide mapping error is claimed.

Measured speed remains separate from map limits. At a sourced 30 km/h limit,
22–30 remain normal; 31/34/35/37/50 trigger red speed digits, a pulsing limit sign,
and a rate-limited spoken warning. Missing limits explicitly say unavailable.
These thresholds pass unit tests; road accuracy still needs physical validation.

Signed native build run 38711513165 reuses the compatible full Xcode archive
38703569746, embeds this source and verifies signatures. All nine bundled wake
model/licence resources match; hosted backend URL is present and provider secret
absent. Temporary signing secrets were removed. Native screen run 38711517579
passed, including the connected guest community feed and adding a parking stop.
The actual guest map, guidance, route-preview flag and trip-with-stop screenshots
were visually inspected. Submission b1e8986d-a0f4-4a4e-b333-042f29694b45 finished;
Apple confirms VALID / IN_BETA_TESTING for 1.0.0 (38). Public commercial launch
remains out of scope; evaluation terms and
free quotas do not constitute an unlimited production service licence.

## October 14 map-first revision (under native validation)

The login/onboarding barrier is removed. Launch animation opens the map; a
one-time invitation enables foreground hands-free listening with microphone
consent. Home/Work, typed routing and deterministic voice are available without
personal identity. Optional accounts live in Settings.

Original light teal/ink cartography, compact destination tiles, collapsed
recents, improved surface contrast and correctly applied row layout replace
the earlier glass styling. CI now launches the actual simulator app and checks
guest access, the voice invitation and Settings, saving native screenshots.

French and English offline iPhone speech tasks share a single microphone.
Command input ends after a pause; only committed final results can act. A
same-breath command following the wake phrase is preserved. Readiness requires
an opened capture. Speech can resume after an interruption and keeps the display
awake when enabled. The Apache-2.0 keyword model remains available as an option.

443 app tests, 18 original backend tests and seven cloud backend checks passed
locally, with typecheck and lint. Cloud checks run against actual workerd/D1,
including anonymous sessions, optional password accounts and pending reports.
Native compilation, cloud deployment and real iPhone wake/ASR testing remain
pending until explicitly recorded below. No claims of physical voice accuracy,
road-noise robustness or production worldwide readiness follow from these tests.

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
- Connected beta 27 can display licensed evaluation mapped speed limits.
  Forward road-sign warnings, live traffic and official hazards remain unavailable.
  Missing data is stated; none is fabricated or inferred from GPS speed.
- Backend is connected through an explicitly approved temporary HTTPS tunnel,
  with remote beta identity and free local AI classification. It is not production
  hosting. No billed AI or public incident feed is enabled. Email verification,
  password reset, account deletion and persistent distributed abuse limits are
  required before public registration.
- The report control checks a fresh stationary GPS fix and requests consent.
  Reports reach the beta queue; production moderation operations remain a gate.
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

## Connected TestFlight beta 27

Version 1.0.0 (27), mobile source `77b6d338bcf7ee53391e43c383a9233353f19b67`:
EAS signed device build `e1818304-2740-48e0-94dd-cc0a2e055367` succeeded.
Submission `c9e605fb-1290-4d28-88c6-47ae1f4e5293` finished. Apple reports VALID
and IN_BETA_TESTING for existing internal testers. The IPA contains the correct
temporary HTTPS backend address, no TomTom secret, and all nine hash-verified
wake-model/licence resources. The latest unsigned simulator workflow was
superseded/cancelled; the signed device Release build is the native result.

423 mobile tests and 18 backend tests passed; typecheck and lint passed.
The live HTTPS smoke test passed remote identity, real TomTom map evidence,
pending incident submission, restricted moderator access, free local AI
classification and session revocation. No synthetic report was made public;
its test identity/report were removed. Paid AI provider calls remain disabled.

Local AI uses Apache-2.0 Qwen2.5-1.5B-Instruct through a MIT llama.cpp runtime.
Four model command samples and two deterministic refusal samples passed;
measured model responses were 0.93–2.11 s locally. A smaller model failed an ETA
sample and was not deployed. Guardrails reject absent saved-place names,
invented destination queries and unrelated route-control actions. This does not
establish general model accuracy, physical ASR accuracy or road-noise robustness.

The computer, local model/gateway and tunnel must stay running for connected
features. Restarting the temporary tunnel changes the hostname and requires a
new phone build. Native foreground wake and local commands do not depend on the
model service. The beta is ready for parked iPhone testing, but the production
gates above and worldwide feature coverage have not been completed.

## October 14 beta network outage

Account creation on build 27 failed because the local gateway and tunnel were
no longer running; its temporary hostname no longer resolved. Restarting the
services produced a different hostname. The connected-beta build profile now
uses the replacement, so build 27 remains unable to connect.

Signed iOS build 28 (`d74e47db-7282-4f38-b227-248d598d78d9`) passed. Its IPA
contains the replacement HTTPS address, excludes the TomTom secret, and has all
nine hash-verified wake-model/licence resources. HTTPS registration, sign-in
session validation, live road evidence, pending incident submission, moderator
access rejection, local classification and logout revocation passed again.
TestFlight submission: `b4a83c42-6dd2-4243-8293-24b8eb4edb44`.
Apple confirms build 28 is VALID / IN_BETA_TESTING for internal testers.

This restores the temporary beta connection; it does not provide permanent
hosting or resilience across computer/tunnel shutdowns. The computer and its
services must remain awake, online and running throughout phone testing.

## October 14 map-first and bilingual revision (not yet distributed)

The next revision opens to the map after the animated splash. Personal accounts
are optional. A first-use invitation offers foreground hands-free recognition,
with French and English on-device recognizers and no ambient cloud fallback.
Commands end audio input after a pause and act on committed results. Voice-ready
status is shown only after native capture opens; retrying or enabling a preference
does not itself indicate readiness. Physical iPhone accent/noise tests remain due.

The original light map interface, saved-place dock, microphone state, partial
transcript feedback, map legal-credit spacing and foreground location ownership
have been revised. Native iOS Release compilation passed on source `1e81691`
(GitHub run `38551366928`). Its simulator UI flow is still running; screenshots
and destination-to-guidance behavior have not yet been verified.

The independent Cloudflare Worker/D1 implementation passed seven local tests
against workerd and a real local database. Anonymous gateway access, optional
account hashing, pending reports and moderator rejection were exercised. The
backend has not been deployed: Cloudflare deployment-tool authorization is still
pending. No permanent URL has been compiled into a device build, and TestFlight
build 28 still uses the computer-dependent tunnel described above.

Guest credentials are scoped to their issuing gateway, so changing the backend
hostname renews anonymous access instead of forwarding an old token. Three
credential tests and typecheck passed after this migration safeguard.

## October 14 independent hosting and signed candidates

Cloudflare authorization and email verification completed. The dashboard confirms
the $0 Free plan. The service is deployed at
`https://avyro-gateway.avyro-cloud-gateway.workers.dev`; it uses hosted D1 and a
private password-hashing Durable Object. No old personal database was imported.
Production WebCrypto rejected the 600k PBKDF2 work factor despite local success;
the portable implementation retains that work factor and matches independent
native PBKDF2, including Unicode input. Eight tests passed on real hosted HTTPS
identity/report endpoints with road/AI disabled. Nine tests now pass locally.

After licensed evaluation road and free AI activation, a public documentation
trace returned a matched 70 km/h limit and one traveled-segment sign. English
Home and French ETA samples classified correctly in 701/649 ms. Lane-change and
negated-action samples returned unknown without model calls. Provider prose,
invented destinations and absent stop categories are rejected. These synthetic
samples establish connectivity, not worldwide completeness or physical accuracy.
The October road counter starts at 100 to reserve prior evaluation consumption.

447 mobile tests, typecheck and lint passed after scoping both guest and account
sessions to the gateway. Signed device build 30 (`5b0828d7-348d-404a-b59a-971e92e971b1`)
compiled and its IPA passed signature/resource, stable URL and secret-absence
checks. It was not submitted. Build 31 (`6bfe4850-1b47-4db6-983a-4099ffe45aac`)
adds readable consent/settings copy and separate visible Apple Maps branding.

Native simulator run `38560642909` confirmed invitation dismissal, map-first
guest access and bilingual settings, using the compiled app from source `e2dd31c`.
Its later failure was the test's wrong "Back" selector (actual "Go back"). The
corrected destination-to-guidance flow is running as `38562129132`. Physical
French/English recognition and car-noise checks remain unperformed. The permanent
backend is ready; the new candidate is not yet available in TestFlight.

Run `38562129132` reached real address results, route preview and active guidance;
its final End assertion timed out before the first guidance GPS update. The
failure screenshot and hierarchy show the live maneuver, route and End button.
Guidance now always offers End while awaiting GPS. The flow refreshes its public
synthetic location after starting and waits for accurate guidance instead of an
old fix. French turn, exit, distance, reroute and arrival speech now derives from
the same OSRM maneuver fields as English. Explicit speech-language metadata keeps
English guidance in English even with an accented French road name. On bilingual
settings, navigation follows the device language (French or English); one-language
settings explicitly select that language. The visual maneuver labels remain English.
450 mobile tests, typecheck and lint pass for these changes. Earlier signed
candidates through 31 are being superseded before TestFlight submission.

## October 14 delivered internal TestFlight build 32

Final executable source: `e61fe25` on the isolated development branch. Native
Release simulator compilation and the complete first-use invitation, guest map,
settings, real address search, route preview and active guidance flow passed in
run `38565516842`. All six native captures were visually inspected. Map credits
and original branding are visible; privacy explanations wrap. This flow declines
voice setup, so it does not establish physical microphone or wake accuracy.

Signed build `51554353-8226-4dec-aebe-0d3313a95b6e` (1.0.0 / 32) passed. The IPA
contains the stable cloud address, excludes the TomTom key and matches all nine
model/license-resource hashes. Submission `8a58f1e9-214c-4fb1-9ce3-e11deae909d1`
finished; Apple confirms VALID / IN_BETA_TESTING for internal testers. External
testing/public App Store publication has not been started. Builds 29–31 were
not submitted. EAS remains Free, 12/30 builds used and totalCost=0.

The owned computer gateway, temporary tunnel and local model processes were
identity-checked and stopped. Hosted health (200), anonymous session issuance
(201) and logout (200) still passed afterward. Local workerd was stopped too.
Real hosted road matching and English/French model samples passed again after
those shutdowns: matched 70 km/h evidence, one traveled-segment sign, Home/ETA
intents in 582/792 ms and both safety/negation refusals. No computer model served
those requests.
Builds through 28 require updating, because their tunnel is retired.

The permanent testing deliverable is ready. Production worldwide road/sign and
official hazard coverage, commercial data entitlements, operational moderation,
personal-account verification/reset/deletion and physical recognition/road-noise
validation remain the documented production gates; no paid services were enabled.
