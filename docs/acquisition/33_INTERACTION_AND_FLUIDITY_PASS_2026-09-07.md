# DEVISERA — Interaction and fluidity pass (7 September 2026)

This pass targets the high-frequency mobile interactions that are easiest to
feel on a real iPhone. It is intentionally code-side and does not claim a
physical-device result until the resulting build has been installed and
exercised on hardware.

## Implemented

- Interactive cards and settings rows now have a short single-tap hand-off
  guard. A second tap arriving while navigation is committing is ignored,
  preventing duplicate route pushes without delaying the first action.
- Navigational cards can opt into a light selection haptic; the clients,
  quotes, leads, dashboard first-quote CTA, client-history rows and plan
  choices use it. The central create tab keeps a stronger impact haptic.
- Icon buttons use the same short native-driver press response as other
  controls. Settings rows now provide consistent selection feedback.
- Skeleton shimmer respects iOS/Android Reduce Motion and becomes a stable,
  readable placeholder instead of running a background animation.
- Scroll containers use a consistent iOS interactive keyboard dismissal,
  16ms scroll event cadence, fast native deceleration, hidden indicators and
  bounded overscroll. This is applied to the shared screen shell, catalogue,
  business profile, quote creation, quote detail and follow-up sheet.
- Virtualized client, quote and lead lists use bounded render windows and
  Android clipping. This limits initial work and off-screen layout cost while
  preserving real server data.
- Catalogue now supports pull-to-refresh with an explicit refreshing state.
- Client, quote and lead list failures now show a recoverable error banner and
  retry action instead of leaving the user with an empty or stale-looking
  screen.

## Deliberate non-changes

No new gesture library or hand-rolled pan responder was added. The previous
full-width scrub gesture could intercept short taps on real devices; the
current bar keeps one action per tab and uses a bounded animated active pill.
Useful swipe actions can be introduced later with a dedicated gesture-handler
dependency and device QA, but adding an untested responder here would risk
reintroducing the exact reliability regression this pass addresses.

## Verification scope

The repository checks for this pass are the mobile TypeScript check and Expo
lint, followed by the root unit/type/lint/build checks and an iOS export. A
physical iPhone still needs the focused TestFlight checklist: cold start,
rapid repeated taps, list scrolling, pull-to-refresh, keyboard dismissal,
Reduce Motion, and navigation while a request is in flight.
