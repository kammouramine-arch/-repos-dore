# Avyro

**Avyro is not another GPS. Avyro is the world’s first AI Driving Companion.**

Sprint 1 builds the ground the companion will stand on: a real navigation app —
splash, onboarding, accounts, a map, destination search, route preview and
turn-by-turn guidance — with the architecture and the finish of something meant
to be maintained for years. **No AI, no memory, no premium tiers yet.** Those
arrive on top of this, not instead of it.

React Native · Expo SDK 57 · TypeScript (strict)

---

## 1. What Sprint 1 ships

| Screen | What it does |
|---|---|
| **Splash** | Native splash hands over to an animated Avyro mark while the app restores its session. |
| **Onboarding** | Three parallax pages, shown once, persisted. |
| **Login / Register** | Validated forms, inline field errors, device-local accounts. |
| **Home** | Full-bleed dark map, live position puck, recent destinations, one way in: *Where to?* |
| **Search** | Debounced place search biased to where the driver is, with recents when the field is empty. |
| **Route preview** | The whole trip fitted on screen, alternatives compared side by side, ETA and distance. |
| **Guidance** | Turn-by-turn: pitched follow camera, maneuver banner, spoken instructions, automatic rerouting, arrival. |
| **Settings** | Account, voice, haptics, screen-awake, units, map style, live traffic. |

Deliberately **not** shipped yet: any hosted model, any server, offline maps,
background guidance, CarPlay/Android Auto, lane guidance, speed limits.

---

## 1b. The conversation engine (0.2)

Say **“Hey Avyro”** and ask for something. Off by default — Settings → Guidance →
Voice commands, because an always-listening microphone is opted into, not
discovered.

| Command | What happens |
|---|---|
| Take me home / to work | Navigates to the saved place, or says it does not know one yet |
| How long until I arrive? | Arrival time and time remaining, from live progress |
| How far is it? | Distance remaining, in the driver's units |
| Cancel navigation | Ends the trip and returns to the map |
| Reroute | Recomputes from the current position |
| Find restaurants / coffee / fuel / parking | Searches nearby, names the closest, and starts navigating |

**Seven states**, in `core/conversation/conversationMachine.ts`: `idle`,
`listening`, `thinking`, `speaking`, `navigation-interrupt`, `resuming`,
`cancelled`. The machine is a pure reducer returning `{ state, effects }` — it
decides, and the controller carries out. That is why the interaction model is
testable without a microphone.

**Navigation always wins.** A maneuver announcement pre-empts every state. What
it suspends is what it restores: interrupted while listening, Avyro listens
again; while thinking, the request was never cancelled; while speaking, the
answer is repeated *from the beginning*, because half a heard sentence is not an
answer. Guidance no longer speaks for itself — announcements go through the
engine, so two voices can never talk over each other.

**Commands are parsed on-device**, deterministically. "Cancel navigation" at
110 km/h cannot wait for a network round trip, and must mean the same thing
every time. Anything outside the vocabulary returns `unknown` and is where a
model belongs.

**No model is hardcoded.** `ConversationProvider` is one method; 0.2 ships
`local-commands`, which answers from the route context with no network. A hosted
model is another implementation, and should sit *behind* this one — control
commands stay local.

**The wake phrase is data**, keyed by locale in `CONVERSATION.wakePhrases`, with
several spellings per locale because recognisers mishear a brand name. Only the
canonical one is ever shown to the driver.

---

## 2. Running it

### Prerequisites

- **Node.js 20+** and npm
- **iOS**: macOS with Xcode 16+ (simulator or device)
- **Android**: Android Studio with an SDK 35 image, or a device with USB debugging
- A **Google Maps SDK for Android** API key — Android only. iOS renders Apple
  Maps and needs no key.

### Install

```bash
cd avyro
npm install
cp .env.example .env      # then edit it — see §3
```

### Run

The supported path is a **development build**, because Avyro's native
configuration (map key, location permission strings, keychain access) is
declared through Expo config plugins in `app.config.ts`, and config plugins are
applied at build time:

```bash
npx expo run:ios          # builds and launches the iOS dev build
npx expo run:android      # builds and launches the Android dev build
```

Afterwards, `npm start` attaches the Metro bundler to an installed dev build.

You can also open the project in **Expo Go** (`npm start`, then scan the QR
code) for a quick look — every library Avyro uses is bundled in Expo Go. Two
caveats: the Android map renders with Expo Go's own Google key rather than
yours, and the permission dialogs show Expo Go's wording rather than Avyro's.

> **Grant location access when asked.** Avyro needs a fix to centre the map, to
> use as the origin of a route, and to guide. Without it the map opens on a
> fallback region and planning a trip is blocked with an inline prompt.

### Checks

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint (expo config)
npm test            # jest — 206 tests
```

All three pass on a clean checkout, `npx expo-doctor` reports 20/20, and CI
(`.github/workflows/avyro-ci.yml`) runs the same three on every push and pull
request that touches `avyro/`.

---

## 3. Configuration

Everything lives in `.env` (git-ignored; `.env.example` is the template).

| Variable | Used at | Purpose |
|---|---|---|
| `EXPO_PUBLIC_PLACES_BASE_URL` | runtime | Nominatim-compatible geocoder. Default: OpenStreetMap's public instance. |
| `EXPO_PUBLIC_ROUTING_BASE_URL` | runtime | OSRM-compatible route planner. Default: the OSRM demo server. |
| `EXPO_PUBLIC_USER_AGENT` | runtime | Identifies the app to those services. Put a real contact address here. |
| `GOOGLE_MAPS_ANDROID_API_KEY` | build | Injected into the Android manifest by the `react-native-maps` config plugin. |

`EXPO_PUBLIC_*` values are **compiled into the JS bundle** and are therefore
public. Nothing secret belongs in them.

> **Before production.** The default geocoding and routing endpoints are the
> public OpenStreetMap and OSRM demo servers. They are excellent for
> development and explicitly unsuitable for production traffic — both are rate
> limited and neither offers an uptime guarantee. Point the two URLs at your own
> instances (or a commercial provider with the same API shape). Nothing else in
> the app changes: the provider is hidden behind `PlacesProvider` and
> `RoutingProvider`.

---

## 4. Architecture

Clean architecture, enforced by a single rule: **dependencies point inwards.**
The domain knows nothing. Services know the domain. Features know both. Nothing
knows a feature.

```
src/
├── app/          Composition root — navigation graph, providers, bootstrap
├── ai/           Reserved for the companion layer (empty; see its README)
├── config/       Environment + tuning constants. No magic numbers elsewhere
├── core/         BUSINESS LOGIC — pure, no React, no React Native
│   ├── domain/       entities · ports (interfaces) · errors
│   ├── conversation/ state machine · command parser · wake phrase · route context
│   ├── navigation/   route index + route tracker (the guidance maths)
│   └── usecases/     authenticate · searchPlaces · planTrip
├── database/     Local persistence — secure store, key-value store, repositories
├── features/     One folder per feature: ui/ · state/ · hooks/
│   ├── auth/ conversation/ home/ location/ navigation/ onboarding/
│   └── route/ search/ settings/ splash/ trip/
├── maps/         Everything that touches react-native-maps
├── services/     Adapters implementing the domain's ports (http, places, routing, location, auth)
├── ui/           Design system — theme tokens, components, feedback
├── utils/        Pure helpers — geometry, polyline, formatting, validation
└── voice/        Spoken guidance: what to say (pure) and how to say it (adapter)
```

**The ports and adapters seam.** `core/domain/ports` declares what Avyro needs —
`PlacesProvider`, `RoutingProvider`, `LocationTracker`, `SpeechEngine`,
`AuthRepository`, three repository interfaces. `services/` and `database/`
implement them. `services/container.ts` is the only file that knows which
implementation is in play, and it accepts overrides so tests can build a
container out of fakes. Swapping OSRM for a commercial router, or the local
account store for a hosted identity service, is a change to one file.

**Nothing is constructed at import time.** `createAppRuntime` builds the
container and every store once during bootstrap, and `AppRuntimeProvider` hands
both down through context (`useServices`, `useStores`, and the bound store hooks
in `app/stores/hooks.ts`). That is what lets a test mount the app — or any
single repository — against fakes without module mocking.

**Where the state lives.** Six small Zustand stores — auth, preferences,
onboarding, location, trip, navigation — each owned by its feature. Routes carry
no parameters: a trip is read by four screens and has to survive every
transition between them, so it lives in a store rather than in navigation state.

**The guidance loop**, end to end:

```
expo-location ─▶ useGuidanceSession ─▶ trackPosition(routeIndex, fix, state)
                        │                        │
                        │                        ├─▶ navigationStore ─▶ banner · status bar · map camera
                        │                        └─▶ nextAnnouncement(...) ─▶ expo-speech
                        └─ off-route × 3 ─▶ planTrip ─▶ replaceRoute
```

`trackPosition` and `nextAnnouncement` are pure functions over plain data. That
is what makes the hard part — snapping a noisy GPS fix onto a polyline, knowing
which maneuver is next, deciding when to speak — testable without a device, and
it is where the tests are.

One detail worth knowing: routing engines attach each maneuver to the *start*
of its step. Avyro's `RouteStep` is a leg that *ends* in a maneuver, because that
is the only shape a banner can render directly ("in 300 m, turn right"). The
OSRM adapter re-aligns the two models; see `osrmRoutingProvider.ts`.

---

## 5. Design

Dark first, because the app is used behind a windscreen for hours. Near-black
background, surfaces separated by luminance rather than borders, one accent
allowed to glow, generous continuous corners, and motion that is fast enough to
feel instant and slow enough to read as deliberate.

Every token is in `src/ui/theme` — colours, the type scale, the 4-point spacing
rhythm, radii, shadows, motion. Components import tokens; no component invents a
colour or a gap. Raw `<Text>` never appears in a screen: `AppText` owns the type
scale, `Button`, `TextField`, `ListRow`, `GlassPanel`, `SegmentedControl` and the
rest own everything else.

The launcher icon, splash artwork and adaptive icons are **generated from the
same geometry the app draws on screen** (`npm run assets`), so the mark can
never drift from the brand.

---

## 6. Dependencies, and why each one is here

### Runtime

| Package | Why |
|---|---|
| `expo` | The SDK, the runtime and the build tooling. |
| `react`, `react-native` | The framework. |
| `@react-navigation/native`, `@react-navigation/native-stack` | Screen graph and native transitions. Native stack because it uses the platform's own animations and back gestures. |
| `react-native-screens` | Native screen containers required by the native stack. |
| `react-native-safe-area-context` | Insets — every floating control over the map is positioned from them. |
| `react-native-reanimated` | UI-thread animation: splash, press feedback, onboarding parallax, banner transitions. Runs while the map is redrawing. |
| `react-native-worklets` | Reanimated 4's worklet runtime. Required peer. |
| `react-native-maps` | The map, polylines, markers and camera. Google Maps on Android, Apple Maps on iOS. |
| `react-native-svg` | The Avyro mark, the maneuver arrows and the map markers — all vector, all crisp at any size. |
| `expo-location` | Permissions and position fixes, at `BestForNavigation` accuracy. |
| `expo-speech` | Everything Avyro says, owned by the conversation engine. |
| `expo-speech-recognition` | Speech to text for the wake phrase and voice commands. |
| `expo-haptics` | Press confirmation, and a pulse as each maneuver comes up. |
| `expo-crypto` | Random identifiers and session tokens; salted hashing for local passwords. |
| `expo-secure-store` | Keychain / keystore. Accounts and sessions live here, nothing else does. |
| `@react-native-async-storage/async-storage` | Non-sensitive local records: preferences, recent destinations, the onboarding flag. |
| `expo-linear-gradient` | The brand gradient — primary buttons, splash and auth backdrops. |
| `expo-blur` | iOS glass panels over the map. Android falls back to an opaque surface (blur there is expensive and inconsistent while the map animates). |
| `expo-splash-screen` | Holds the native splash until React can take over, so there is no white flash. |
| `expo-system-ui` | Sets the root background colour, which is what you see behind a screen transition. |
| `expo-keep-awake` | Keeps the display on during guidance, when the driver asked for it. |
| `@expo/vector-icons` | Ionicons — the UI icon set. (Maneuver arrows are drawn, not iconised.) |
| `expo-font` | Required peer of `@expo/vector-icons`; loads the icon font. |
| `zustand` | State. Small, unopinionated, no provider tree, works fine outside React — which the guidance loop needs. |
| `expo-status-bar` | Status bar appearance. |

### Development

| Package | Why |
|---|---|
| `typescript`, `@types/react` | Strict TypeScript across the project. |
| `eslint`, `eslint-config-expo` | The lint rules Expo ships for React Native, including the React Compiler hook rules. |
| `jest`, `jest-expo`, `@types/jest` | Test runner, preconfigured for the Expo/React Native module graph. |

Nothing else is installed. `react-native-gesture-handler` was removed once it
turned out nothing used it.

> **Icons are imported from their family, never from the barrel.** Use
> `@/ui/components/Icon`, which re-exports Ionicons from
> `@expo/vector-icons/Ionicons`. Importing `{ Ionicons } from '@expo/vector-icons'`
> pulls in every family and bundles ~3.6 MB of fonts Avyro never draws.

---

## 7. Tests

```bash
npm test
```

206 tests, covering the parts where a mistake is expensive and a device would not
help you find it:

- `utils/geo` — great-circle distance, bearing, projection onto a segment and a
  polyline, cumulative distances.
- `utils/polyline` — the encoded-polyline decoder, against Google's reference
  vector, at both precisions.
- `utils/format` — driver-facing distance, duration and arrival formatting, in
  both unit systems.
- `core/navigation/routeTracker` — snapping onto the route, counting down to a
  maneuver, advancing steps, never stepping backwards, arrival, and off-route
  detection with its confirmation threshold.
- `voice/guidanceAnnouncer` — the announcement policy: each threshold once, no
  bursts when fixes arrive slowly, reset per step, arrival spoken once.
- `services/routing/instructionFormatter` — maneuver wording and the OSRM
  maneuver mapping, including the unknown-type fallback.
- `services/http/decode` — the response validators: what they accept, what they
  reject, and where strictness matters (a dropped route step would misdirect a
  driver, so route decoding is strict; a dropped search result is cosmetic, so
  search decoding is lenient).
- `services/auth` — password digests, session expiry, the migration from the
  Sprint 1 account record, and the rehash-on-sign-in path that a future
  server-side KDF depends on.
- `maps/geometry/routeWindow` — the slice of route drawn during guidance.
- `core/conversation/conversationMachine` — every state transition, including
  each way a maneuver can interrupt a turn and how it resumes.
- `core/conversation/commandParser` — all ten commands, the phrasings a driver
  would actually use, precedence between them, and what it refuses to guess.
- `core/conversation/wakePhrase` and `routeContext` — matching, localisation
  fallback, and what Avyro knows about the drive.
- `services/ai/localConversationProvider` — every reply and action, including
  the graceful failures.

---

## 8. Known limits going into Sprint 2

- **Accounts are device-local.** `LocalAuthRepository` stores salted SHA-256
  digests in the platform keystore so Sprint 1 has a real, complete auth flow
  without a server. It is a stand-in, not a security design: password stretching
  (Argon2id) belongs on the server, and moves there with the hosted identity
  service. The `AuthRepository` port is the seam.
- **Guidance is foreground-only.** Leaving the app pauses location updates.
  Background guidance needs a background location task and its own permission
  copy.
- **No offline maps or cached routes.** Losing the network mid-trip keeps the
  current route on screen but blocks rerouting.
- **English only.** All driver-facing wording is in
  `services/routing/instructionFormatter.ts`, `voice/guidanceAnnouncer.ts` and
  the screens; localisation was scoped out, not designed out.
