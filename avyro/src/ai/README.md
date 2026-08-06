# `src/ai` — reserved for a hosted model

> Avyro is the world’s first AI Driving Companion. This directory is where a
> model, when one earns its place, plugs in.

Still empty, and that is now a narrower statement than it was.

Release 0.2 built the seam and shipped an implementation behind it:

- **The port** — `core/domain/ports/conversationProvider.ts`. One method:
  `respond(request) → reply`. It receives the full `RouteContext` and returns
  speech *and* an action, so no caller has to infer intent from prose.
- **The implementation** — `services/ai/localConversationProvider.ts`
  (`local-commands`). Deterministic, on-device, no network. It understands
  Avyro's command vocabulary and answers from the route context.
- **The wiring** — `services/container.ts`, one line.

## What belongs here

A `ConversationProvider` backed by a hosted model, for everything the local
provider returns as `unknown`.

It should sit **behind** the local provider, not replace it. The commands that
matter most — cancel navigation, how far, reroute — are exactly the ones that
must not wait on a network, must work in a tunnel, and must mean the same thing
every time. A model earns the open-ended half of the conversation; it does not
get the steering wheel.

## What still does not belong here

Memory, personality and proactive speech were all explicitly out of scope for
0.2 and remain so. None of them are blocked by anything in the architecture —
which is the point of writing it down rather than building it early.
