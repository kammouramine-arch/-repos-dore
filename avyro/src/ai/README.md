# `src/ai` — the companion layer landed in `services/ai`

> Avyro is the world’s first AI Driving Companion. This directory was reserved
> for the model layer. Release 0.3 built it — and built it one level down.

**Look in `services/ai/` instead.** A model is reached over the network, so it
is an adapter, and adapters live in `services/`. Putting it here would have
carved out a second, parallel place for I/O and broken the one structural rule
Avyro has: dependencies point inwards, and everything that talks to the outside
world sits in the same ring.

What 0.3 shipped, and where:

| Piece | File |
|---|---|
| The port a model implements | `core/domain/ports/aiProvider.ts` |
| The port the engine sees | `core/domain/ports/conversationProvider.ts` |
| The gateway that decides | `services/ai/aiGateway.ts` |
| The deterministic resolver | `services/ai/localConversationProvider.ts` |
| The model adapter | `services/ai/openAiProvider.ts` |
| The vocabulary boundary | `services/ai/intentEnvelope.ts` |
| The wiring | `services/container.ts` |

The reasoning is in **`docs/Developer-Bible.md` §4**: deterministic first, the
model classifies rather than acts, and failure is a normal path.

## What still does not belong anywhere

Memory, personality and proactive speech were out of scope for 0.2 and 0.3 and
remain so. None of them are blocked by anything in the architecture — which is
the point of writing it down rather than building it early.

This directory is kept only so the pointer above has somewhere to live. It holds
no code and should not acquire any.
