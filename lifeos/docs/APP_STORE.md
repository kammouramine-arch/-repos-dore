# App Store submission — LifeOS

Everything App Store Connect needs, with the exact values. Nothing here is guesswork:
product identifiers and prices come from `supabase/functions/_shared/plans.ts`, which is
the same catalogue the app and the entitlement system read.

| | |
|---|---|
| App name | LifeOS — Your AI Life Coach |
| Bundle ID | `com.aminekammour.lifeos` |
| App Store Connect App ID | `6806351278` |
| Apple Team ID | `9Q6YL8R33R` |
| On-device name | LifeOS |

---

## 1. Subscriptions

Create **one subscription group** containing all six products. A single group is what
lets a subscriber move between Plus, Pro and Ultra as an upgrade or downgrade rather
than as two separate purchases.

**Group reference name:** `LifeOS Plans`
**Group display name:** `LifeOS`

Ranking within the group matters: App Store Connect uses it to decide what counts as an
upgrade. Order from highest service level to lowest — Ultra, Pro, Plus.

| Product ID | Reference name | Duration | Price (EUR) | Level |
|---|---|---|---|---|
| `lifeos.ultra.yearly` | LifeOS Ultra — Yearly | 1 year | 399.99 | 1 |
| `lifeos.ultra.monthly` | LifeOS Ultra — Monthly | 1 month | 49.99 | 1 |
| `lifeos.pro.yearly` | LifeOS Pro — Yearly | 1 year | 159.99 | 2 |
| `lifeos.pro.monthly` | LifeOS Pro — Monthly | 1 month | 19.99 | 2 |
| `lifeos.plus.yearly` | LifeOS Plus — Yearly | 1 year | 79.99 | 3 |
| `lifeos.plus.monthly` | LifeOS Plus — Monthly | 1 month | 9.99 | 3 |

The product IDs must match character for character. `planForProduct()` maps a purchase
back to a tier by exact string, so a typo in App Store Connect produces a completed
purchase that grants nothing.

### Per-product localisation

Each product needs at least one localisation. Suggested English copy:

| Product | Display name | Description |
|---|---|---|
| Plus monthly / yearly | LifeOS Plus | More conversations, advanced analyses, and deeper planning each month. |
| Pro monthly / yearly | LifeOS Pro | Everything in Plus, plus deep life analysis and AI agents that act on your plan. |
| Ultra monthly / yearly | LifeOS Ultra | The highest allowance, the strongest models, and the most agent runs. |

Describe what the tier includes, not "unlimited" — no plan is unlimited and the app
never claims otherwise.

### Review information

Each subscription needs a screenshot of the paywall as the reviewer will see it, plus a
note. Suggested note:

> Subscriptions are purchased on the LifeOS paywall, reachable from Settings → Plan or
> from any upgrade prompt. A sandbox account can complete the purchase; the plan changes
> within a few seconds and no user data is removed when a subscription ends.

---

## 2. App Privacy

Answers that match what the app actually does:

| Question | Answer |
|---|---|
| Does the app collect data? | Yes |
| Contact info — email address | Collected, **linked** to identity, used for App Functionality |
| User content — other user content | Collected, **linked** to identity, used for App Functionality |
| Identifiers — user ID | Collected, **linked** to identity, used for App Functionality |
| Usage data | Collected, **linked**, App Functionality and Analytics |
| Is any data used for tracking? | **No** |
| Third-party advertising? | **No** |

LifeOS uses no advertising identifier and no cross-app tracking, so no App Tracking
Transparency prompt is required and the tracking answer is a clean no.

---

## 3. Export compliance

`ITSAppUsesNonExemptEncryption` is already `false` in the app config, so the
questionnaire is skipped on every upload. The app uses only standard HTTPS.

---

## 4. Metadata still to write

Not in this repository — these are yours to write in App Store Connect:

- Subtitle (30 characters)
- Promotional text (170 characters)
- Description (4000 characters)
- Keywords (100 characters)
- Support URL and Marketing URL
- Screenshots: 6.9" and 6.5" iPhone are required; iPad if you keep `supportsTablet`
- Age rating questionnaire
- Sign-in details for the reviewer — a working account, since LifeOS requires one

The reviewer **will** open the assistant. It must answer. See `docs/DEPLOYMENT.md` for
the provider configuration that makes that true.
