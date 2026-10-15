# meepmeep execution ledger

## Baseline audit — 2026-10-16
- Branch: chatgpt/meepmeep-v2-20261016, based on 2dab182. Existing Avyro branch preserved.
- Installed candidate: Avyro 1.0.0 (39), source 4506598, Apple VALID / IN_BETA_TESTING confirmed. Native motion test d55dfa6 changes only test infrastructure.
- Expo 57 / React Native 0.86; native Swift MapKit search and sherpa-onnx KWS; Cloudflare gateway/D1/Workers AI; TomTom routing and road evidence. Existing connected iOS routing does not use OSRM, but unconfigured fallback does.
- Existing functional paths have automated/simulator evidence: guest entry, saved destinations, typeahead, route preview/guidance, route alternatives and stops, microphone handoff reducer, command classification, incident persistence. They are not proof of physical-device reliability.
- New recordings reviewed: RFSJ9793 (239s) shows road alerts and speed-limit changes; JXNY3758 shows marker/perspective ambiguity; KXWR9802 shows prolonged microphone preparation. MHZI5176 provides edge-light reference; IIEQ5865 launch-motion reference. Both HEIC references reviewed (probationary/rain controls and video enforcement). Private recordings remain outside Git.
- Critical gaps: road confidence measures matching, not sign truth/directional applicability; lookahead uses planned geometry as a snap input; native KWS model is recreated on main thread for every wake session; preparation has unbounded asynchronous checks; continuous speech fallback still exists; branding/locale/settings coverage incomplete.
- Existing model card declares Apache 2.0 separately from engine licence. New wake tokenization and physical-noise performance must be validated; no model training claims.
- Current quotas and evaluation credentials are for bounded testing. Commercial road-data rights and world coverage are not established. No paid activation/public release authorized.
- Stripe Directory lookup attempted with latest official CLI/plugin; endpoint rejected its user agent. Provider comparison continues using official sources.

## Initial execution gates (historical; current checkpoint below)
Track each stage separately; never mark device-only work verified by mocks.
- A audit: initial inventory complete; dependency/signing/credential metadata inspection ongoing.
- B correctness: in progress; fail closed on unsupported directional signs; inspect speed evidence and maneuver anchors.
- C voice: pending native lifecycle correction, meepmeep tokenization and audio checks.
- D AI/TTS: existing bounded classifier and Whisper; conversational tool execution, voice selection and service constraints to audit/implement.
- E identity/UI: pending original assets, launch, map/voice/settings redesign, EN/FR architecture.
- F advanced: pending probationary rules, motorcycle/rain controls, reporting verification/expiry. Enforcement feed absent; cannot invent coverage.
- G QA: pending changed-source checks, native build/UI/audio evidence. Real iPhone/noise/battery/road cases explicitly unverified until measured.
- H delivery: no meepmeep release yet. Preserve bundle app.avyro.companion and ASC 6799133947. Internal TestFlight requested; public publication forbidden without approval.

## Required evidence
Record source SHA, build/signing workflow, model/resource hashes, unit/integration/native results, reviewed screenshots, source/confidence policy and physical-device checklist. Keep blocked items visible and continue independent stages.

## Stability slice — implemented, not yet device-validated
- Unsupported planned-route sign overlays suppressed on both gateway and client; no planned geometry is used as current speed evidence. Current GPS-trace evidence additionally rejects opposite/crossing segment headings. Unknown is explicitly displayed; reduced-motion disables overspeed pulses.
- Dedicated offline KWS only; continuous speech fallback removed. Model loading moved off main and weights retained between turns. Repeated failed starts stop after three attempts with tap-to-talk fallback. Native compilation/device performance still pending.
- Typecheck and lint passed. App Jest: 48 suites / 510 tests passed. Backend: 49 tests passed, including workerd + local D1 (AI disabled). Initial backend run had seven connection failures because the local service was not running; rerun after starting it passed.
- Existing 12-second road request cadence with 5-second evidence lifetime produces deliberate unknown intervals. Increasing validity would hide uncertainty; current 1,000/month evaluation cap cannot support continuous broad commercial usage. Licensed sustainable coverage is an external release dependency.

## Native/identity slice — implementation in progress
- Phonetic 2025-12-20 KWS weights replace failed BPE new-name configuration. Separate original ModelScope model declaration and hashes bundled; English wake phrase only, EN/FR command recognition. Actual bundled ONNX: 24/24 synthetic positives, 0/40 controls; harder synthetic set 16/16, 0/48. Physical/recorded driving-noise, false activations per hour, CPU/battery remain unverified. Operating point intentionally documented; no claim of production wake reliability.
- Native audio-level callback drives original edge treatment. Command UI waits for capture readiness. Original vector logo/icon and live car entrance plus synthesized 0.48s ambient two-note cue; silent switch respected by native ambient session. Native validation pending.
- Preserved app.avyro.companion, EAS project and storage keys. Internal product becomes meepmeep; workflows adjusted for native product name. Brand commercial clearance unresolved (existing MeepMeep companion product).
- Real route preferences: motorcycle (provider beta), toll and motorway avoidance forwarded to provider. Unknown maneuver codes fail closed; roundabout exit first. 2D home camera, smaller car, lower guidance pitch. No claim that provider graph errors are solved worldwide.
- French R413-5 pure rules tested for 110/100/80 maxima and lower restrictions. Connected feed only establishes other-road classification for local streets/roundabouts; motorway legal category unavailable, no invented adjustment. Native voice selection, manual rain shield and dynamic iOS dark colors implemented, device UI verification pending.
- Sources: https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route ; https://www.service-public.gouv.fr/particuliers/vosdroits/F19460 ; https://www.cnil.fr/fr/videoverbalisation . No verified lawful enforcement feed: enforcement overlay unavailable.
- Natural voice: enhanced installed Apple voices are supported. ElevenLabs free tier lacks commercial rights (https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform); no paid subscription started.


### Follow-up execution: commands and community observations
- Explicit EN/FR toll/motorway commands persist real preferences and recalculate an active trip while preserving intermediate stops. Late reroute results cannot resurrect a cancelled/replaced trip.
- Next-maneuver queries use current guidance. Structured last-four-intent context expires after five minutes and never persists raw transcripts; closer-stop follow-ups compare returned geographic candidates.
- Production service graph no longer falls back to the public OSRM demo when a gateway is missing.
- Community duplicate checks preserve opposing directions; author withdrawal and nearby confirmed/not-seen feedback use authenticated, rate-limited endpoints. Community feedback never becomes verified road data. Three recent distinct not-seen observations can expire an unverified report when they outweigh confirmations.
- Backend schema changes are additive. Local workerd/D1 tests passed 8/8 after isolating synthetic rate-limit identities between test runs. Earlier rerun failures were quota reuse (429), not hidden as passes.
- Native compile of 44cb09d succeeded; simulator setup was superseded by the complete new-model native compile at eb442ab (run 38819075370). Neither is a new signed release.


### Enforcement-data boundary
CNIL describes vidéo-verbalisation as remote human observation by authorized agents, not an automatic speed-camera feed: https://www.cnil.fr/fr/videoverbalisation . R413-15 restricts devices providing enforcement-equipment locations in France: https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025111528/2026-06-16 . This does not establish every country's law or treat every police observation as equivalent to a radar. No jurisdiction-aware permissions or verified licensed enforcement feed exist here, so enforcement pins/submission are disabled for this build. Accident/hazard/traffic/closure reporting remains available. No invented camera locations or live traffic-light colours.

### Interface coverage
French static copy now covers primary map, search, guidance, onboarding, reports and settings surfaces via explicit translation sites (never auto-translating addresses). Separate UI language/appearance controls persist. ES/DE/IT/AR are declared unavailable; Arabic direction metadata exists but RTL screens are not shipped or claimed validated. Dynamic error strings and native system prompts still need a full localization QA pass; French is not yet claimed 100% complete.


### Validation checkpoint
App: 50 suites / 526 tests passed; selected cloud/roads/routing backend suite 42/42 passed; typecheck and lint passed. The next regression adds cancellation/newest-destination ownership (two tests) after finding that late trip plans could revive cleared state. This follow-up must be included in the final signed binary, not just the branch.
Hosted backend cece023 deployed with additive D1 tables: version c512500a-ecbc-4bf7-a4aa-98961d5ccf45. No paid plan activated.
Signed native candidate 40 is compiling from cece023 in run 38820513290; it is not submitted, and will need the final JavaScript commit embedded and re-signed before release.


### Desktop wake performance (not iPhone performance)
Bundled-model hard synthetic set: 16/16 positives, 0/48 controls. On this Windows PC, one inference thread loaded the model in 0.722 s and processed 268.47 s of audio in 6.168 s (real-time factor 0.023). Gaussian-added noise is not recorded driving noise. This result establishes neither mounted-iPhone accuracy nor battery/thermal behavior; those remain physical-device checks.

Latest source validation: typecheck and lint pass; 52 app suites / 533 tests pass; cloud tests 22/22 and road/routing/local-classifier tests 24/24 pass. Includes trip cancellation ownership, French maneuver copy, new wake-address transcription cleanup, and authenticated optional-account deletion. Physical-device checks remain unverified.

Private desktop replay of 237.46 seconds from the supplied road recording produced no wake activations. Equal-RMS mixes of that screen-recorded audio with synthetic speech detected 24/24 wake samples and activated on 0/72 control samples. This includes app/recorded audio, not a calibrated in-car microphone test; hardware validation remains open. Hosted final backend version: da64cd01-a50a-412b-9771-cc4690f66770.

## Current release checkpoint
- A: existing repository, distribution identity, credentials metadata and provider setup audited; isolated branch retained.
- B: uncertain sign suppression, GPS/direction evidence guards, route cancellation ownership, camera/puck and maneuver formatting implemented. Live graph correctness/worldwide coverage remain unverified.
- C: real bundled Apache-licensed KWS and native audio handoff compiled. Desktop audio checks passed. Mounted-iPhone/BT/long-session validation remains open.
- D: capped hosted AI intent tools and Whisper transcription verified with live authenticated requests; native installed-voice selection implemented. Physical speech quality/latency unverified.
- E: original identity/launch, voice perimeter, dark/light and primary EN/FR UI implemented. Native screen checks running. Other locales and full dynamic-error localization are not complete.
- F: probationary pure rules, motorcycle route preferences, manual rain shield, authenticated community feedback/dedup/withdrawal implemented. Enforcement data deliberately disabled; native rain interactions still need device checks.
- G: 533 app tests, 46 cloud/road/routing tests, typecheck and lint pass. Simulator native compilation succeeded. Reuse checks initially stopped on a model-card correction; executable/model bytes matched, so updated documentation is now copied explicitly while native compatibility remains enforced.
- H: signed build 40 produced from 1ebb97fbc4dd65ed463a3f6326009e1588056b67 in run 38822242760. IPA SHA-256 59918aea9bd91f5ad6f9a4e515df726a78f312c6f1131ab52de295569ca62a24. Bundle ID app.avyro.companion, display name meepmeep. Every bundled model/license file matches Git bytes. Not yet submitted to Apple at this checkpoint. Later commits so far change only tests/workflow/docs.

### Native QA findings and repairs
- French/dark interaction run 38822405941 passed. Screenshot review still found pale shortcut controls and untranslated Home labels; corrected in abcab77 and rerunning visual validation.
- Car run 38822409971 lost the XCTest transport after dismissing onboarding (DeviceUnreachableException); no moving-car assertion ran. Rerun in 38823880680.
- Guest run 38822402776 passed launch, reports menu, nearby parking, settings scroll, search, route preview, navigation, zero speed, trip details and swipe dismissal, then failed adding parking. Live public-coordinate waypoint probe reproduced HTTP 502 Unsupported maneuver returned.
- Root cause: missing documented WAYPOINT_LEFT/RIGHT/REACHED decoding. Added distinct waypoint, ferry and follow types (official taxonomy: https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/guidance-instructions). Unknown codes still fail closed. Regression verifies an intermediate stop does not end the trip. Hosted replay now HTTP 200, one waypoint plus final arrival. Backend version 8ee3c3f0-fe8b-40ff-805e-e93a92e0c1df.
- Voice run 38822725727 could not see the opened event: the expanded trace began with old disabled events below a clipped viewport. This did not establish native failure or success. New test first requires the actual ready Home label, then current native-ready and 30-second stability diagnostics.
- Updated app: 52 suites / 535 tests pass; typecheck and lint pass; routing tests 9/9. Signed build 40 refreshed from 28c323bb783add1ef0d6f035e08c517098ebe95f, run 38824366908, SHA-256 93e5906ebd7faedd9e75d437504029dcce66037d56ab492053919793f756f50f. Native model/license bytes verified against Git. Temporary GitHub signing secrets removed. Earlier candidate IPA is superseded and must not be submitted.
