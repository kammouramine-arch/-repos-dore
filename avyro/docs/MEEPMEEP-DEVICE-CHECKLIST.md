# meepmeep internal iPhone acceptance

This is the physical-device gate, not a record of passed tests. Desktop model
replay, automated state tests and simulator navigation cannot establish actual
iPhone microphone reliability, road accuracy, Bluetooth behavior or battery life.

## Start while stationary

1. Install the specified TestFlight build, retaining the existing app identity.
   Confirm the home-screen name is meepmeep and that saved places survived an
   upgrade. Also check a fresh install separately; deleting the app erases local
   saved places.
2. Open the app. Verify the original car/logo transition finishes and the map
   becomes usable without an account. Silent mode must silence the launch cue.
3. Accept hands-free AI only after reviewing the first-use disclosure. Grant
   microphone/speech/location permissions. Declining must preserve map access.
4. Save Home and Work. Say “Hey meepmeep”, pause for the ready cue, then “Take me
   home”. The **English wake phrase is used for both French and English commands**.
   Test “Emmène-moi au travail”, a city, and a full numbered street address.
5. Repeat at ordinary volume ten times with the mounted phone. Record misses,
   unintended activations, wake-to-ready delay and command-to-route delay. Do not
   include private addresses or raw recordings in public issues.
6. Test “What is the speed limit here?”, “Quelle est la prochaine instruction ?”,
   “Avoid tolls”, “Évite les autoroutes”, and “Find parking near our destination”.
   Confirm route/preferences actually change. Unknown road facts must remain
   unknown. Ask for somewhere closer after a nearby category search.
7. Test cancellation, a phone/audio interruption, headset/Bluetooth connection,
   and returning from background. The assistant must recover or clearly offer
   tap-to-talk; it must not remain apparently listening without capturing audio.
   Foreground wake operation is the supported scope.
8. Verify speech/response overlays disappear and do not obscure maneuvers. Check
   the chosen installed voice, French interface, dark/light mode, large text,
   Reduce Motion and VoiceOver. Untranslated dynamic errors may fall back to English.
9. Select motorcycle and rain protection. Start a route while stationary, lock,
   try ordinary map taps, then hold Unlock for three seconds. Confirm VoiceOver
   Unlock works and backgrounding releases the shield. Essential iOS controls
   must remain usable. This is a manual touch shield, not rain detection.
10. Submit a real observation only where appropriate. Verify it appears as
    **unverified**, survives reopening, and can be withdrawn by its author.
    Nearby feedback must not silently promote it to authoritative road data.

## Navigation checks with a passenger or recorded review

Do not deliberately exceed a posted limit or operate test controls while driving.
The overspeed color/pulse logic is also covered by controlled tests.

- Car orientation and camera: known straight road, bend, stop, restart, roundabout,
  missed turn and GPS obstruction. Confirm no side-to-side camera chase or
  backwards car. Raw uncertain GPS must not be presented as perfect road matching.
- Confirm maneuvers against actual geometry, roundabout exits and destination
  entrance. A provider graph error is still possible; capture the route/step for
  investigation instead of assuming a polished animation makes it correct.
- Compare mapped limits with actual signs, including the reported 30 km/h areas.
  The indicator must clear on stale/ambiguous evidence. Current speed zero is
  appropriate only with a valid stationary measurement; unavailable GPS is distinct.
- French probationary mode must never raise a lower local limit. Automatic
  motorway adjustment is unavailable where the legal category is unknown.
- Trip details: tap the summary, inspect the full destination, alternatives and
  stops; swipe down to dismiss. Choose an alternative and add a parking stop.
- Test a network loss and recovery. Existing guidance may continue from loaded
  data, but a new online route/search or cloud speech may be unavailable. This is
  not a downloadable offline-map product.
- Run at least a 45-minute mounted session and record battery drop, heat,
  interruptions and false wakes. Repeat with Bluetooth/car audio and ordinary
  cabin noise. These measurements are still outstanding.

## Explicit limits of this internal build

- Apple map/search; TomTom routes and matched-road evidence through the hosted
  Cloudflare gateway. Worldwide feature/accuracy/commercial coverage is not
  guaranteed. Evaluation caps can cause unavailable road information.
- Unsupported directional stop/light/yield and enforcement overlays are disabled.
  There are no invented signal colors, police pins or video-enforcement locations.
- Motorcycle routing is a provider beta; passenger-car limits are hidden for it.
- EN/FR primary UI and commands; Spanish/German/Italian/Arabic are not shipped as
  completed locales. The wake detector has an English phonetic phrase, not a
  verified multilingual wake model.
- Real Workers AI interpretation and Whisper transcription are capped for free
  testing. Enhanced native voices depend on voices installed on the phone.
- The meepmeep name is provisional pending commercial name clearance. Internal
  TestFlight is authorized; no public launch or paid subscription is authorized.
