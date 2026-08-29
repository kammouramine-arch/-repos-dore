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
| Privacy Policy URL | `https://kammouramine-arch.github.io/-repos-dore/legal/privacy.html` |
| Terms of Use (EULA) URL | `https://kammouramine-arch.github.io/-repos-dore/legal/terms.html` |
| Support email | `lifeos.ai.contact@gmail.com` |
| Support URL | `https://kammouramine-arch.github.io/-repos-dore/legal/` |

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
- Screenshots: 6.9" and 6.5" iPhone are required; iPad too, since `supportsTablet` is on
- Age rating questionnaire

Support URL and Privacy Policy URL are listed at the top of this document.

---

## 5. App Review information

LifeOS requires an account, so review **will** fail without working credentials.
Create a real account on the production project, complete onboarding once so the
reviewer lands on a populated app, and enter it under App Review Information →
Sign-In Required.

Suggested review notes:

> LifeOS is a personal planning assistant with an AI coach.
>
> Sign in with the credentials provided. The AI assistant is reachable from the Talk
> tab and from any suggestion card. Onboarding runs on first launch and can be
> repeated from Settings.
>
> Subscriptions are purchased from the paywall, reachable via Settings → Plan or any
> upgrade prompt. Deep Life Analysis requires Pro and AI Agents require Ultra; on the
> free tier both show an upgrade prompt rather than failing.
>
> Voice input uses the microphone only while the button is held. No data is used for
> advertising or tracking, and the app contains no advertising identifier.

---

## 6. Pre-submission checklist

Each of these is verified or must be verified before the build goes out.

| Check | State |
|---|---|
| Bundle ID matches the App Store Connect record | verified — `com.aminekammour.lifeos` |
| Production build resolves a real Supabase URL and key | verified in config, guarded at build time |
| Assistant answers in production | verified with live calls |
| Onboarding completes in production | verified with a live call |
| Account deletion available in-app | verified — Settings → Privacy |
| Data export available in-app | verified — Settings → Privacy |
| Restore purchases on the paywall | verified |
| Store-localised prices, not catalogue defaults | verified — falls back only when the store is unreachable |
| Terms and Privacy links render in the paywall | verified |
| Legal URLs return 200 | **requires GitHub Pages to be enabled** |
| Six subscription products live in App Store Connect | **manual — section 1** |
| Reviewer sign-in credentials supplied | **manual — section 5** |
| No advertising identifier or tracking | verified — no IDFA, no ATT prompt needed |
| Export compliance | verified — `ITSAppUsesNonExemptEncryption: false` |
| Sign in with Apple | not required — email/password is the only sign-in method |
