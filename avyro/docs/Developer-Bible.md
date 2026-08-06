# The Avyro Developer Bible

**Avyro is the world’s first AI Driving Companion.**

This is the permanent engineering reference for Avyro. It records the decisions
that are already made, the reasoning behind them, and the rules a change has to
respect. Read it before making an architectural decision; if a decision here is
wrong, change *this document* in the same commit that changes the code, so the
two never disagree.

It is written for the engineer who joins in two years and has to be productive
in an afternoon.

| | |
|---|---|
| **Applies to** | `avyro/` — the React Native application |
| **Current release** | 0.3 — Context Intelligence |
| **Stack** | React Native 0.86 · Expo SDK 57 · React 19 · TypeScript 6 (strict) |
| **Last reviewed** | Release 0.3 |

---

## 1. Architecture

### 1.1 One rule

**Dependencies point inwards.**

```
 features ──▶ services ──▶ core ◀── database
     │            │          ▲          │
     └────────────┴──────────┘          │
                  maps · ui · voice ────┘
```

- `core/` knows nothing. No React, no React Native, no `fetch`, no Expo module,
  no store. Pure TypeScript over plain data.
- `services/` and `database/` know `core/`. They implement its ports.
- `features/` know both, and own everything the driver can see or touch.
- **Nothing knows a feature.** If `core/` or `services/` needs something from a
  screen, the design is wrong — pass it in.

This is the only structural rule, and it is not negotiable. Every other
convention in this document exists to make it cheap to follow.

### 1.2 Why

Avyro's hard parts are not the screens. They are: snapping a noisy GPS fix onto
a polyline, knowing which maneuver comes next, deciding when to speak, deciding
whether a stop is worth a detour, and deciding what a spoken sentence means at
110 km/h. All of those are pure functions over plain data, and all of them are
testable in milliseconds on a laptop **only if they are not entangled with
React, the network, or a device.**

Keeping them in `core/` is what makes the test suite fast enough that nobody
skips it, and it is why the maths gets tested at all.

### 1.3 Ports and adapters

`core/domain/ports` declares what Avyro *needs*, in Avyro's own vocabulary:

| Port | Implemented today by |
|---|---|
| `PlacesProvider` | `services/places/nominatimPlacesProvider` |
| `RoutingProvider` | `services/routing/osrmRoutingProvider` |
| `LocationTracker` | `services/location/expoLocationTracker` |
| `SpeechEngine` | `voice/expoSpeechEngine` |
| `SpeechRecognizer` | `services/speech/expoSpeechRecognizer` |
| `ConversationProvider` | `services/ai/aiGateway` (fronting `localConversationProvider`) |
| `AiProvider` | `services/ai/openAiProvider` |
| `AuthRepository` | `services/auth/localAuthRepository` |
| `PreferencesRepository`, `OnboardingRepository`, `RecentDestinationsRepository`, `SavedPlacesRepository` | `database/repositories/*` |
| `Logger`, `CrashReporter` | `services/observability/*` |

A port is written from the *caller's* need, never from the vendor's API. That is
why `RoutingProvider.getRoutes` takes an origin, a destination and optional
waypoints, and not an OSRM query string. Swapping OSRM for a commercial router
is a new file plus one line in the container; nothing above the port changes.

**A vendor name may appear inside `services/`. It may never appear above it.**
Grep for `osrm`, `nominatim` or `openai` outside `services/` — the answer should
stay zero.

### 1.4 The three loops

Everything the app does at speed is one of three loops. Know them before
changing anything nearby.

**The guidance loop** — location in, speech and camera out:

```
expo-location ─▶ useGuidanceSession ─▶ trackPosition(routeIndex, fix, state)
                        │                        │
                        │                        ├─▶ navigationStore ─▶ banner · status bar · camera
                        │                        └─▶ nextAnnouncement(...) ─▶ conversation engine ─▶ TTS
                        └─ off-route × 3 ─▶ planTrip ─▶ replaceRoute
```

**The conversation loop** — speech in, speech and actions out:

```
SpeechRecognizer ─▶ wake phrase ─▶ conversationReducer ─▶ effects
                                          │                  ├─▶ ask-provider ─▶ AI Gateway
                                          │                  ├─▶ speak ─▶ SpeechEngine
                                          │                  └─▶ run-action ─▶ navigation / trip stores
                                          └── navigation-announcement pre-empts every state
```

**The recommendation loop** — a need in, a priced stop out:

```
"I need coffee" ─▶ PlacesProvider.search ─▶ per candidate: route origin→stop→destination
                                                    │
                                          detour = via − baseline
                                                    ▼
                                          rankStops ─▶ one suggestion + the tradeoff, spoken
```

### 1.5 State

Small Zustand stores, one per feature, each owned by that feature: `auth`,
`preferences`, `onboarding`, `location`, `trip`, `navigation`, `conversation`.

Navigation routes carry **no parameters**. A trip is read by four screens and
must survive every transition between them, so it lives in `tripStore`, not in
React Navigation state. A screen that needs the trip reads the store; it is
never handed a serialised copy that can go stale.

Stores hold state and the transitions on it. They do not perform I/O, and they
do not import a service directly — the hook that owns the loop does that, and
calls the store.

---

## 2. Engineering principles

These are the tie-breakers. When two designs both work, the one that satisfies
more of these wins.

### 2.1 The car is the constraint

Every decision is made for someone doing 110 km/h with their eyes on the road.
That single fact settles most arguments:

- **A control command never waits on a network.** "Cancel navigation" is parsed
  on-device and executed on-device. Always.
- **Latency is a safety property.** An answer that arrives after the junction is
  not a late answer, it is a wrong one. Every remote call has a hard deadline.
- **Never invent facts.** Avyro says "I cannot see live traffic" rather than
  guessing at road conditions, because a driver told "traffic is clear" will
  believe it. Missing data is stated, never filled in.
- **One voice.** Guidance and conversation share the same speech channel through
  the conversation engine, so two utterances can never overlap.

### 2.2 Determinism first, intelligence on top

A model is an *optimisation over* a working deterministic system, never a
dependency of one. Pull the model out and Avyro still navigates, still answers
"how far", still cancels, still reroutes. See §4.

### 2.3 Unknown is not zero

When a value cannot be measured, it is ranked as the worst acceptable value, not
as free. An unpriceable detour scores as `RECOMMENDATION.maxDetourSeconds`; an
unrated place scores as neutral, not as bad. Guessing in the driver's favour is
how a companion becomes a liar.

### 2.4 Fail visibly to us, gracefully to the driver

Every failure path is logged with structure and a breadcrumb, and every failure
path has a defined driver-facing outcome. There is no `catch {}`. There is also
no stack trace read aloud in a car.

### 2.5 Pure where it counts

If a piece of logic can be a pure function over plain data, it is one, and it
lives in `core/`. Side effects live at the edges: hooks, adapters, the
container. This is why the state machine returns effects instead of performing
them.

### 2.6 No magic numbers

Anything a product or engineering decision could change lives in
`config/appConfig.ts` with a comment explaining the choice. A tuning constant
buried in a scorer is a decision nobody can find later.

### 2.7 Validate at the boundary

Anything crossing into the app from outside — HTTP, storage, a model — is
decoded and validated before it becomes a domain object. Strictness is chosen
per boundary by consequence: route decoding is strict (a dropped step misdirects
a driver), search decoding is lenient (a dropped result is cosmetic).

### 2.8 Small modules, named for what they decide

`detour.ts`, `rankStops.ts`, `intentEnvelope.ts`, `wakePhrase.ts`. One decision
per file, a name that says which decision, and a doc comment that says *why the
decision is made that way*. Files that grow past a few hundred lines are usually
two decisions wearing a coat.

### 2.9 Comments explain reasoning, not mechanics

The code says what it does. A comment exists to record the *why* that would
otherwise be lost — the constraint, the alternative rejected, the bug that made
this necessary. See §6.4.

---

## 3. Dependency Injection

### 3.1 Nothing is constructed at import time

There is no module-level singleton anywhere in Avyro. Not for the HTTP client,
not for the container, not for a store. Importing a module must have no side
effect beyond defining things.

The cost of a singleton is not style: it is that a test cannot replace it
without module mocking, and module mocking is how a suite becomes untrustworthy.

### 3.2 The shape

```
createAppRuntime()                       app/runtime — called once, at bootstrap
   ├── createServiceContainer(overrides) services/container.ts
   └── createStores(container)           app/stores
                │
     AppRuntimeProvider (React context)
                │
        useServices() · useStores() · useXStore(selector)
```

- **`services/container.ts` is the only file that knows which implementation is
  in play.** It is the single place a vendor is chosen.
- It takes `ServiceOverrides` — any part of the graph can be replaced and the
  rest is still wired for you. That is the test seam and the staging seam.
- `app/stores/hooks.ts` binds each store to the runtime while preserving the
  familiar `useXStore(selector)` call shape, so consuming code reads like plain
  Zustand.

### 3.3 Rules

1. **Constructor injection, always.** Every factory takes its dependencies as a
   single options object: `createOsrmRoutingProvider({ http })`. No factory
   reaches for a global.
2. **Depend on the port, not the adapter.** Type your parameter
   `RoutingProvider`, never `ReturnType<typeof createOsrmRoutingProvider>`.
3. **Compose in the container, not in a feature.** A screen or hook that
   constructs a service has moved the composition root into the UI. Add it to
   the container and read it from `useServices()`.
4. **Declaration order matters and is intentional.** The container builds
   bottom-up: `http` → providers → recommender → local conversation provider →
   gateway. Adding a dependency means placing it after what it needs.
5. **Factories, not classes.** Closures over the options object; return an
   object literal typed as the port. No `this`, no inheritance, no decorators.

### 3.4 Adding a service — the whole checklist

1. Write the port in `core/domain/ports/`, in Avyro's vocabulary.
2. Write the adapter in `services/` (or `database/`), decoding at the boundary.
3. Add it to `ServiceContainer` and construct it in `createServiceContainer`,
   honouring `overrides.<name> ??`.
4. Consume it through `useServices()`, or pass it into a `core/` function.
5. Test the pure part directly; test the adapter against a fake `HttpClient`.

---

## 4. The AI Gateway

### 4.1 What it is

```
Conversation Engine ─▶ AI Gateway ─▶ AiProvider ─▶ OpenAI today, anything tomorrow
                            └──────▶ deterministic resolver (always, first)
```

The conversation engine depends on `ConversationProvider` and on nothing else —
exactly as it did in 0.2, before any model existed. Which backend answers,
whether one is consulted at all, and what happens when one fails are decisions
that live in `services/ai/aiGateway.ts` and nowhere else.

### 4.2 Three rules, in order of how much they matter

**1. Deterministic first.** `local.respond()` runs before anything else. If the
on-device parser recognised the utterance, that reply is returned and the model
is never called. Nothing a model could add to "cancel navigation" is worth the
latency, and plenty could be worth the risk.

**2. The model classifies; the app acts.** For an utterance the parser cannot
place, the provider returns an *intent from Avyro's own vocabulary*. The gateway
executes it through `local.resolve(intent, request)` — the same deterministic
path a parsed command takes — and **discards the model's prose**, because the
deterministic reply is the one that matches what actually happened. A model may
choose *which* capability to invoke. It can never define one.

**3. Failure is a normal path, not an exception.** No provider configured, a
timeout, an outage, malformed JSON, a hallucinated intent — every one of them
returns `null` from `askProvider` and lands on the local reply. `respond()`
always resolves. Navigation is never waiting on any of this.

### 4.3 The deadline

`AI.requestTimeoutMs` (4 s) is enforced by the gateway with its own
`AbortController`, independently of any timeout inside the adapter. A request
that never settles would strand the conversation engine in `thinking` forever,
and a driver would be left with a spinner at speed. The caller's signal is
chained, so a driver who says something else cancels the request they replaced.

### 4.4 The vocabulary boundary

`services/ai/intentEnvelope.ts` validates every model response against the
intent kinds and argument values Avyro actually implements
(`VOICE_INTENT_KINDS`, `NearbyCategory`, `SavedPlaceSlot`).

- An unknown kind (`play-music`) → rejected.
- A known kind missing its argument (`navigate-saved` with no slot) → rejected.
- An argument outside the vocabulary (`category: "pharmacy"`) → rejected.
- Nonsense intent with a usable sentence → intent dropped, sentence kept.

**There is no path from a model's imagination to an action.** This boundary is
the entire safety argument for putting a model in a car; treat a change to it as
a change to a safety system.

### 4.5 Keys and endpoints

`EXPO_PUBLIC_*` values are **compiled into the bundle and are public**. An API
key in a shipped binary is a published key: extractable in minutes and billable
indefinitely.

Therefore `openAiProvider` defaults its `baseUrl` to `env.aiGatewayUrl` — *your
own proxy*, which holds the credential, applies your rate limits, and is where a
provider can be swapped without shipping an app update. It falls back to
`api.openai.com` only when a key is explicitly set, and warns loudly when it
does. With neither configured, `isConfigured()` is false, the gateway never
calls out, and the app answers deterministically. **A stock build ships with no
model and works completely.**

### 4.6 Adding a provider

Implement `AiProvider` (`id`, `isConfigured()`, `complete()`), decode its
response into an `AiCompletion` through `decodeIntentEnvelope`, and swap it in
`createServiceContainer`. Do not touch the gateway: if a provider needs the
gateway changed, the port is wrong.

---

## 5. The Conversation Engine

### 5.1 The state machine

`core/conversation/conversationMachine.ts` is a pure reducer:
`(state, event) → { state, effects }`. It starts no microphone and speaks no
word. It decides *what should happen*; the controller
(`features/conversation/hooks/useConversationEngine.ts`) carries it out. That
separation is why the interaction model can be tested without a device — and the
interaction model is the product.

Seven states:

| State | Meaning |
|---|---|
| `idle` | Waiting for the wake phrase |
| `listening` | Microphone open, transcript accumulating |
| `thinking` | Provider consulted, reply pending |
| `speaking` | Reply being spoken, action already running |
| `navigation-interrupt` | A maneuver pre-empted the turn |
| `resuming` | Restoring what the interrupt suspended |
| `cancelled` | The turn ended; briefly observable, then `idle` |

Effects are the only way anything happens: `start-listening`, `stop-listening`,
`ask-provider`, `speak`, `stop-speaking`, `run-action`, `schedule-dismiss`.

### 5.2 Navigation always wins

`navigation-announcement` is handled **before the state switch**, so it pre-empts
every state. What it suspends is what it restores:

- interrupted while **listening** → Avyro listens again;
- while **thinking** → the request was never cancelled, the reply still arrives;
- while **speaking** → the answer is repeated **from the beginning**, because
  half a heard sentence is not an answer and we cannot know where it was cut.

An interrupt stops the current utterance before starting its own; otherwise the
platform queues them and the maneuver arrives after the turn — which is to say,
after the turn.

The action runs *as* the reply is spoken, not after it: a driver who asked to go
home should see the route while they hear it.

### 5.3 The wake phrase is data

`CONVERSATION.wakePhrases`, keyed by locale, several spellings each, matched
after normalising case, punctuation and accents. Recognisers transcribe a brand
name inconsistently; refusing "hey aviro" would make Avyro feel deaf rather than
precise. Only the canonical spelling is ever shown to the driver. Localisation
is a data change, not a code change.

### 5.4 Route context

`core/conversation/routeContext.ts` assembles everything Avyro knows about the
drive into one value, per turn: navigation state, destination, previous
destination, route, location, heading, referent, remaining distance, remaining
duration, arrival time, units, and whether a trip is actually running.

Two rules inside it:

- **Live progress beats the route's totals.** Once moving, "8 km to go" must
  mean eight kilometres from *here*. Before guidance starts there is no
  progress, so the planned route answers instead — which is what makes "how long
  is it?" work on the preview screen too.
- **The snapped position is the truthful one while guiding.** It is where the car
  is *on the road*, which is what every route calculation needs.

A provider receives the whole context and therefore never reaches into
application state.

### 5.5 The parser

`commandParser.ts` is deterministic, on-device, and ordered by precedence.
Restore-destination is matched before "go home" so "go back to my original
destination" is not a trip home; control commands beat searches; questions beat
searches.

Its job is **to be certain or silent**. A wrong guess at speed is worse than
handing the sentence on, so anything outside the vocabulary returns `unknown` —
which is precisely the input the AI Gateway exists to handle.

### 5.6 Context reasoning (0.3)

A need — "I'm hungry", "I need coffee", "I need fuel", "find parking" — is
answered by measurement, not proximity:

1. `PlacesProvider.search` around the driver.
2. For each candidate (capped at `RECOMMENDATION.maxCandidates`, because each
   one costs a routing request), route `origin → candidate → destination` with
   the candidate as a waypoint, and subtract the baseline trip.
   **"Adds three minutes" is a subtraction, not a guess.**
3. `detour.ts` decides whether a stop is genuinely *ahead* — inside the corridor
   and past a minimum lead, so a place level with the car is not sold as
   upcoming.
4. `rankStops.ts` scores: cost in minutes, a bonus for being on the way, rating
   only as a tie-breaker. Anything over `maxDetourSeconds` is not offered at all,
   because a twenty-minute detour for coffee is a worse answer than "nothing
   nearby".
5. Avyro **suggests and remembers** — it sets `referent` and says the tradeoff
   out loud. It does not reroute a moving car on one heard word. The driver
   confirms with "take me there".

With no trip planned, there is no detour to price, so ranking falls back to
proximity and no routing requests are made.

### 5.7 Adding a command

1. Add the intent kind to `VoiceIntent` **and** to `VOICE_INTENT_KINDS` — the
   second is what the model is told about and what the envelope validates.
2. Teach `commandParser.ts` the phrasings a driver would actually use, and place
   it correctly in the precedence order.
3. Handle it in `localConversationProvider.resolveIntent`, including the case
   where there is no trip and the case where the data is missing.
4. If it changes the trip, handle the action in `runConversationAction.ts`.
5. Test: the phrasings, the precedence, the reply, the action, and the failure.

---

## 6. Coding standards

### 6.1 TypeScript

- **Strict, plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`.**
  Never weaken the compiler to pass a change.
- **No `any`.** Unknown input is `unknown` and is narrowed by a decoder.
- **No non-null assertions (`!`)** on anything that crosses a boundary. If a
  value can be absent, the type says so and the code handles it.
- **Discriminated unions over booleans and optional fields.** `VoiceIntent`,
  `ConversationAction` and `ConversationEffect` are all unions on `kind`/`type`
  so the compiler enumerates the cases for you.
- **`readonly` and `as const`** for anything that should not be mutated —
  every config block is `as const`.
- **`import type`** for type-only imports; path alias `@/*` → `src/*`.

### 6.2 Modules

- **Factory functions, not classes.** `createThing(options)` returning an object
  typed as its port.
- **One options object** per factory, destructured in the signature with
  defaults visible.
- **Named exports only.** No default exports — they make a rename invisible.
- **No barrel files that pull in weight.** Icons are imported from their family
  (`@/ui/components/Icon`), never from `@expo/vector-icons`, which bundles
  ~3.6 MB of fonts Avyro never draws.

### 6.3 Naming

- Ports are capabilities: `RoutingProvider`, `SpeechEngine`.
- Adapters name their vendor: `osrmRoutingProvider`, `nominatimPlacesProvider`.
- Factories are `createX`. Hooks are `useX`. Pure decisions are verbs:
  `rankStops`, `trackPosition`, `nextAnnouncement`, `parseCommand`.
- Booleans read as assertions: `isAhead`, `isNavigating`, `isConfigured`.
- Units are in the name. `detourSeconds`, `remainingDistanceMeters`,
  `listenTimeoutMs`. A number called `distance` is a bug waiting for a
  continent.

### 6.4 Comments

Comments carry the reasoning that the code cannot. The house style:

```ts
// Rerouting a moving car on one heard word is presumption, not help. The
// driver confirms with "take me there" — which is why this is the referent.
```

Not:

```ts
// set the referent
```

Every non-obvious module opens with a doc comment stating what it decides and
why it decides it that way. Constants explain their value. Tests describe the
behaviour in a sentence a product person would recognise.

### 6.5 UI

- **Tokens only.** Colours, spacing, radii, type and motion come from
  `ui/theme`. No component invents a colour or a gap.
- **Never raw `<Text>` in a screen.** `AppText` owns the type scale.
- Dark first: near-black ground, surfaces separated by luminance rather than
  borders, one accent allowed to glow, generous continuous corners.
- Motion fast enough to feel instant, slow enough to read as deliberate.
- **Do not change the UI in a foundation release.** See §8.

### 6.6 Errors and logging

- Domain errors are typed (`core/domain/errors`), not strings thrown from
  nowhere.
- Log through the injected `Logger` with structured fields — never `console.*`
  outside `services/observability`.
- Scope a logger per module: `logger.scoped('ai.gateway')`.
- Add a `crashReporter` breadcrumb where a failure changes behaviour the driver
  will notice.
- Never log a transcript, a credential, or a precise position.

### 6.7 Tests

- **Jest + jest-expo.** `npm test` must be green before anything is pushed.
- Test the pure core directly; test adapters against fakes built from ports.
- **A test asserts a behaviour, not an implementation.** Its name is a sentence:
  *"does not treat an unpriceable candidate as free"*.
- **No wall-clock timing assertions.** They are flaky, and a flaky test is worse
  than no test. Inject `now`; use fake timers for deadlines.
- When a test and the code disagree, decide which is wrong on the merits — and
  then fix that one. Never edit an assertion to make a failure disappear.

### 6.8 Definition of done

`npm run typecheck` · `npm run lint` · `npm test` all clean, locally and in CI
(`.github/workflows/avyro-ci.yml`). No `TODO` left in shipped code — either the
work is in the release or it is written down in §8's technical-debt list.

---

## 7. Folder structure

```
avyro/
├── App.tsx                    Mounts the runtime provider and the navigation graph
├── app.config.ts              Expo config + native config plugins (build-time)
├── docs/Developer-Bible.md    This document
├── scripts/                   Asset generation (icons, splash) from app geometry
└── src/
    ├── app/                   COMPOSITION ROOT
    │   ├── navigation/            Screen graph, navigationRef, linking
    │   ├── runtime/               createAppRuntime, AppRuntimeProvider, bootstrap
    │   └── stores/                Store creation + bound hooks
    ├── ai/                    Reserved for the companion layer (see its README)
    ├── config/                env.ts (public runtime config) · appConfig.ts (tuning)
    ├── core/                  BUSINESS LOGIC — pure. No React, no RN, no I/O
    │   ├── domain/                entities · ports · errors
    │   ├── conversation/          machine · parser · wake phrase · route context
    │   │                          · detour · rankStops · replyText
    │   ├── navigation/            route index · route tracker (the guidance maths)
    │   └── usecases/              authenticate · searchPlaces · planTrip
    ├── database/              Local persistence — secure store, key-value, repositories
    │   └── migrations/            Versioned, one-time storage migrations
    ├── features/              One folder per feature: ui/ · state/ · hooks/
    │   ├── auth/ conversation/ home/ location/ navigation/ onboarding/
    │   └── route/ search/ settings/ splash/ trip/
    ├── maps/                  Everything touching react-native-maps
    ├── services/              ADAPTERS implementing the domain's ports
    │   ├── ai/                    aiGateway · openAiProvider · intentEnvelope
    │   │                          · localConversationProvider
    │   ├── conversation/          routeAwareRecommender
    │   ├── auth/ http/ location/ observability/ places/ routing/ speech/
    │   └── container.ts           THE ONLY FILE THAT CHOOSES IMPLEMENTATIONS
    ├── ui/                    Design system — theme tokens, components, feedback
    ├── utils/                 Pure helpers — geo, polyline, format, validation
    └── voice/                 Spoken guidance: what to say (pure) · how (adapter)
```

**Where does new code go?** Ask what it depends on:

| It needs… | It belongs in |
|---|---|
| nothing but plain data | `core/` (and it should be tested) |
| the network, a device API, or a vendor | `services/` or `database/`, behind a port |
| React, but not a screen | `features/<feature>/hooks/` |
| to be visible | `features/<feature>/ui/`, built from `ui/` components |
| to be shared by two features and is not a decision | `utils/` or `ui/` |
| to choose an implementation | `services/container.ts`, and nowhere else |

Feature folders never import each other's internals. Two features that need the
same logic share it through `core/`, `services/` or `ui/` — never by reaching
sideways.

---

## 8. Release philosophy

### 8.1 Build the release you were asked for, then stop

Each release has a stated scope. Work inside it, finish it completely, and stop.
Do not start the next one because it is obvious. Scope creep in a codebase this
young is how the architecture stops meaning anything.

The corollary: **never rename, refactor or redesign unrelated parts of the
project unless explicitly instructed.** A diff that touches things the release
did not ask about cannot be reviewed.

### 8.2 Production quality, every release

There are no prototypes here. Every release compiles clean under strict
TypeScript, passes lint, passes its tests, and would survive a senior review.
**No placeholder implementations** — if something cannot be built properly in
this release, it is either scoped out and written down, or it is not merged.

### 8.3 Feature by feature, compiling all the way

Build one feature at a time and get it green before starting the next. A branch
that has been red for a day has lost the only signal it had.

### 8.4 Foundation releases exist and do not touch the UI

`0.1.1` was engineering-only: DI, rendering, CI, logging, validation. Its rule
was "no new user-facing features, do not change the UI", and that rule is what
made it reviewable. Expect more of these. They are not overhead; they are what
keeps the feature releases cheap.

### 8.5 Honesty over polish

The release notes say what was *not* built, what is a stand-in, and what will
hurt later. Nominatim returns no ratings, so the rating weight in the scorer is
currently inert — that is documented rather than hidden behind a fabricated
number. Device-local accounts are a stand-in, not a security design, and say so.

A known limitation written down is technical debt. An unknown one is a defect.

### 8.6 What every release produces

1. The code, green on typecheck, lint and tests.
2. Documentation updated in the same commit — the README for how it runs, this
   Bible when a decision changed.
3. A summary: what shipped, what it costs, what is still owed.

### 8.7 The release record

| Release | Scope |
|---|---|
| **Sprint 1** | Navigation app: splash, onboarding, auth, map, search, route preview, turn-by-turn guidance. No AI. |
| **0.1.1** | Foundation only: DI, route rendering, bounded projection, icon imports, CI, crash-reporting port, structured logging, HTTP validation, auth migration prep. No UI change. |
| **Rebrand** | Nova → Avyro, company-wide. |
| **0.2** | Conversation Engine: STT/TTS ports, the seven-state machine, wake phrase, route context, ten commands, navigation interrupt/resume, `ConversationProvider`. No model. |
| **0.3** | Context Intelligence: AI Gateway, `AiProvider`, intent envelope, route-aware recommendation, trip-quality questions, voice rerouting, deterministic fallback, this document. |

### 8.8 Deliberately not built yet

Recorded here so nobody mistakes absence for oversight: memory, personality
selection, proactive AI, calendar, phone calls, weather conversation, premium
tiers, hosted identity, background guidance, offline maps, CarPlay/Android Auto,
localisation of driver-facing copy, live traffic.

---

## 9. Before you change anything

1. Read the doc comment at the top of the file. It usually contains the argument
   you are about to have.
2. Ask which layer the change belongs to (§1.1). If it is going in the wrong
   one, the design is what needs changing.
3. Ask what happens at 110 km/h when it fails (§2.1).
4. If it is a number, put it in `appConfig.ts` with a reason (§2.6).
5. If it is a decision, make it a pure function in `core/` and test it (§2.5).
6. If it chooses an implementation, it goes in the container and nowhere else
   (§3.3).
7. Run typecheck, lint and tests before you push (§6.8).
8. Update this document if you changed what it says.
