# `src/ai` — reserved

Empty by design. Sprint 1 ships **no AI**, and shipping a placeholder
abstraction for a feature nobody has specified is how architectures rot.

This directory exists to name the seam. When the companion layer arrives it
belongs here, and it plugs into the app the same way every other capability
does:

1. Define the port in `src/core/domain/ports` — e.g. `CompanionEngine`, in
   terms of Nova's own entities (`Route`, `NavigationProgress`, `Place`).
2. Implement the adapter here, in `src/ai`, against whichever provider is
   chosen. Nothing outside this directory learns the provider's name.
3. Register it in `src/services/container.ts`.
4. Consume it from a feature — most likely `src/features/navigation`, where
   `useGuidanceSession` already receives every position fix and every
   maneuver, and `src/voice` already owns everything spoken aloud.

The guidance loop was written with that in mind: `nextAnnouncement` is a pure
function that decides *what to say and when*, so a smarter policy replaces one
function rather than the navigation stack.
