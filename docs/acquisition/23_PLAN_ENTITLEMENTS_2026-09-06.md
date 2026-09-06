# DEVISERA plan entitlements — 6 September 2026

## Actual plan matrix

All usage counters are per organisation and reset at the UTC calendar month. The
server is the source of truth; mobile/web visibility never grants access.

| Entitlement | Essentiel (€39) | Pro (€79) | Entreprise (€149) |
|---|---:|---:|---:|
| AI quote generations / month | 50 | 300 | 1,000 |
| Server audio transcriptions / month | 50 | 300 | 1,000 |
| AI photo analyses / month | 25 | 150 | 500 |
| Quotes sent / month | 100 | Unlimited | Unlimited |
| Follow-ups sent / month | 100 | 1,000 | Unlimited |
| Included seats | 1 | 3 | 10 |
| Scheduled follow-up automations | No | Yes | Yes |
| Public quote-request form | Yes | Yes | Yes |
| Team/invitation capability | Planned/read-only surface | Planned/read-only surface | Planned/read-only surface |

The client database, catalogue and exports currently have no plan-count ceiling;
photo uploads remain subject to the existing per-file/platform validation. These
are deliberate current behaviours, not hidden unlimited promises.

## What was true before this change

- Quote-generation, sent-quote and sent-follow-up limits were already checked on
  server routes.
- The visible plan definitions already showed different prices, seats and feature
  flags.
- Audio transcription and photo analysis incremented usage records but did not
  check a plan-specific ceiling first.
- Automation settings could be called directly even when the plan flag was false,
  and scheduled automations were not rejected for Essentiel.
- The team page displayed seat counts but there is no invitation mutation endpoint;
  it is therefore not represented as a fully operational team feature yet.

## Changes implemented

- Added server-enforced transcription and photo-analysis quotas.
- Added monthly usage display for both counters to web analytics, subscription and
  mobile subscription screens.
- Added a server-side automation feature gate and prevented scheduled automation
  creation for Essentiel while retaining manual follow-up capability.
- Replaced Enterprise's unlimited AI generation claim with a 1,000-generation cap
  (and explicit 1,000/1,000 transcription/photo caps).
- Added unit coverage for the tier progression and the economic cap.

## Cost rationale

The repository records provider/model/token telemetry, but it does not contain a
verified contract price for the configured AI provider. Exact euro cost per request
must therefore not be fabricated. The chosen caps are conservative product limits,
centralised in `packages/shared/src/plans.ts`, and can be changed without touching
route logic. Before public launch, the owner should compare observed token usage and
provider invoices against these caps and revise the central table if needed.

## Subscription lifecycle

- The three-day trial is defined once in the shared plan module and used by the
  Stripe checkout path and Apple flow metadata.
- Active, trialing and past-due states are writable according to the shared access
  state; canceled/incomplete or expired trials are blocked server-side.
- Stripe plan changes use immediate proration for upgrades and period-end changes
  for downgrades. Apple plan mapping is based on the existing stable product IDs.
- No live Apple or Stripe prices/products were changed by this work. Those changes
  remain an owner/App Store or billing-dashboard action.
