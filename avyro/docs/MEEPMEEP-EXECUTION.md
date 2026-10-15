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

## Execution / release gates
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
