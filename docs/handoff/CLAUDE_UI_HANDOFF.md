# Claude → ChatGPT — UI handoff (branch `claude/devisera-ui`)

Scope: visual design, layout, information architecture, motion, presentation states. No change to authentication state machine, email verification, StoreKit purchase, entitlements, API authorization, database, Teams, Resend. Every API call used by the redesigned screens is the same call the previous screens made.

## Files changed

| File | What |
| --- | --- |
| `mobile/app/_layout.tsx` | Shared header chrome: centred title, system back hidden, app-provided `HeaderBack`; registers `paiements` and `suppression`. |
| `mobile/app/(app)/plus.tsx` | « Mon espace » rebuilt as the account hub (identity on brand surface, grouped rows). |
| `mobile/app/compte.tsx` | « Mon compte » reduced to identity, sign-in address, language, security/data rows; links to `/suppression`. |
| `mobile/app/suppression.tsx` | New: account deletion screen (same `api.auth.deleteAccount` + `signOut`). |
| `mobile/app/paiements.tsx` | New: « Paiements et factures » (current plan, history rows, empty/loading/error states, Apple links). |
| `mobile/app/(app)/index.tsx` | Uses the shared `BrandBackdrop`/`useBrandSurface`. |
| `mobile/src/components/header-back.tsx` | New: chevron + « Retour » back control (44 pt target, press scale, haptic). |
| `mobile/src/components/brand-backdrop.tsx` | New: shared brand gradient backdrop + light status bar while focused. |
| `mobile/src/components/settings.tsx` | New: `SettingsGroup`, `SettingsRow`, `StatusChip`, `IdentityHeader`. |
| `mobile/src/components/plan-card.tsx` | New: subscription plan card (selected ring + check, « Recommandé », store-provided price). |
| `mobile/src/components/apple-paywall.tsx` | Plan list now renders `PlanCard`; purchase logic untouched. |
| `mobile/src/components/scrub-tab-bar.tsx` | Tab bar rebuilt: contained surface, single gliding indicator, icon crossfade, raised « + ». |
| `mobile/src/components/ui.tsx` | `ErrorState` gains `icon`, `tone`, `action`. |
| `mobile/src/theme/gradient.ts` | `GRADIENT_SPAN.settings = 0.5`. |
| `mobile/src/lib/i18n.ts` | New copy keys (`back`, `personalInfo`, `manageSubscription`, `invoices`, `tools`, `assistance`, `legal`, `privacy`, `terms`, `dangerZone`, `deleteAccount`, `verifiedEmail`, `unverifiedEmail`, `security`, `exportPersonal`, `exportBusiness`, `shareDiagnostics`, …) and EN entries. |
| `mobile/src/lib/review.ts` | `openReviewPage` exported (used by « Noter l’application »). |
| `packages/shared/src/contracts.ts` | Additive: `PaymentDTO`, `PaymentHistoryDTO`. |
| `packages/shared/src/api-client.ts` | Additive: `billing.payments()` → `GET /api/billing/paiements`. |
| `scripts/captures-lancement.mjs` | Captures the settings screens (web export, 393×852). |
| `tests/unit/mon-espace.test.ts` | Guards the IA split, header back, tab-bar invariants. |

Dependencies added: none.

## Design tokens

No colour, radius, shadow or type-scale change. New span `GRADIENT_SPAN.settings`. All radii come from `radius`, shadows from `shadows`, icons from Ionicons only.

## Animations added

- `HeaderBack`: press scale 0.94 (shared spring), selection haptic.
- Tab bar: one indicator pill (spring damping 22 / stiffness 300), positioned without animation on first layout; icons crossfade outline→filled with 1.08 scale and −1.5 pt lift; labels keep weight 600 (no width shift); « + » press scale 0.88 with medium impact haptic; indicator fades out on the create tab. Reduce Motion: no springs.
- Rows/cards: existing `useTouchMotion` compression.

## Navigation presentation

- Root stack: `headerTitleAlign: 'center'`, `headerBackVisible: false`, `headerLeft` = `HeaderBack` when `canGoBack`. Titles unchanged. Reason: the native back button rendered as an empty capsule on iPhone (screenshots 7 Sept).
- New routes: `/paiements` (« Paiements et factures »), `/suppression` (« Supprimer mon compte »), both inside the connected group; `suppression` is also reachable from the unverified stack.

## Information architecture

Mon espace → Compte (Informations personnelles, Mon entreprise) · Abonnement et paiements (Gérer mon abonnement, Paiements et factures) · Outils (Catalogue, Activité, Découvrir) · Assistance (Nous contacter → `mailto:contact@devisera.fr`, Noter l’application) · Informations légales (Politique de confidentialité `/confidentialite`, Conditions d’utilisation `/conditions`, opened in the in-app browser) · Zone sensible (Supprimer mon compte) · Se déconnecter.

Mon compte → Identité · Adresse de connexion (status chip; code flow shown only when unverified, changing, or a code was requested) · Langue · Sécurité et données (exports, diagnostics, sign out) · Supprimer mon compte.

## Data the UI expects (engineering)

1. **`GET /api/billing/paiements`** → `{ data: { items: PaymentDTO[] } }` with `PaymentDTO = { id, date (ISO), amountCents, currency (ISO 4217), source: 'apple'|'web', status: 'paid'|'pending'|'failed'|'refunded', label, receiptUrl: string|null }`. Until it exists the screen treats `NOT_FOUND` as an empty history (no error shown). Other errors show a retry state.
2. Plan prices on the paywall are rendered exactly as `product.displayPrice` from StoreKit; the UI never formats or converts currency.
3. `session.user.emailVerified`, `session.subscription.{plan,status,provider,currentPeriodEnd}` drive the chips and the payments summary — unchanged fields.

## Behaviour to preserve

- `api.auth.updateName`, `requestEmailCode`, `confirmEmailCode`, `updateLanguage`, `exportPersonal`, `exportBusiness`, `deleteAccount(password)`, `signOut` are called with the same arguments as before.
- Deletion still signs the user out after success and surfaces `businessRecordsRetained`.
- The tab bar still emits `tabPress` with `canPreventDefault` and hides while the keyboard is open.

## Engineering requirements discovered

- **Mentions légales**: no web route exists (`/mentions-legales` → 404), so the Legal group lists only Privacy and Terms. Add the page and the UI will get a third row (`SettingsRow` in `plus.tsx`).
- **Owner self-deletion**: `DELETE /api/auth/account` answers 422 « Transférez la propriété de votre espace » for a sole owner; the deletion screen surfaces that message as-is. A solo artisan therefore cannot delete their account — App Review gate.
- **Payments history endpoint** (above) is the only missing data source for the new screen.
- **Paywall error alert**: the unexpected-error alert seen on iPhone (« Une erreur inattendue s’est produite ») comes from the purchase/entitlement path, untouched here; when fixed, the `Banner tone="danger"` already renders `error` inline — prefer that over `Alert`.

## Polish pass — 9 September 2026 (branch `claude/devisera-ui`, no logic change)

Motion system (`mobile/src/components/motion.tsx`): `Enter` (fade + 10 pt rise, 260 ms), `Stagger` (children enter 45–70 ms apart), `useCountUp` (numbers count to their value, JS driver, no replay when unchanged), `SuccessCheck` (spring check), `Breathe` (slow scale loop). All respect Reduce Motion.

Applied: home cards and metrics (`(app)/index.tsx`), activity metrics + empty CTA (`analytique.tsx`), Mon espace groups (`(app)/plus.tsx`), client/quote list rows (`clients.tsx`, `devis.tsx`), client profile rebuilt as identity card + contact actions + metrics + quote rows (`clients/[id].tsx`, same API calls), quote creation: listening rings + waveform + brand glow, breathing sparkles during AI processing, spring checks per step, « Votre devis est prêt » reveal (`devis/nouveau.tsx`, `voice-visuals.tsx`).

States: `Skeleton` now shimmers (native-driven gradient band), `EmptyState` is branded (accent disc + halo, entrance), `AnimatedAmount`/`AnimatedCount` primitives, toast success icon springs in, success toasts added for client added, catalogue saved/removed, name/email/language saved. Tab-bar indicator hides on hidden routes. Card shadow tightened (`shadows.card`), new `shadows.glow` brand shadow. Profile avatar: image fade-in, light ring, camera edit badge, busy veil, press feedback.

No dependency added. No API change. Engineering note: the dictation waveform is a listening *state*, not a level meter — the native recogniser exposes no audio level; if one is exposed later, `Waveform` can take an `level` prop.

## Personalization pass — 10 September 2026

- Home: greeting reveals in three beats (eyebrow, name, sentence) once per mount; the
  sentence is contextual (first quote / quotes awaiting a reply / quotes in progress /
  up to date). "Vos devis" horizontal carousel (`quote-carousel.tsx`): dominant card with
  the next one peeking 36 pt, snap interval, animated page dots, per-card status badge,
  amount from `QuoteSummaryDTO.totalCents`, tap opens `/devis/[id]`, branded empty state.
  "À compléter" (`setup-progress.tsx`): three facts read from real data
  (`features/setup-status.ts`): legal identifier + reachable contact, at least one
  catalogue item, at least one client; animated progress bar; completed rows stay listed
  with a check; the card disappears only when all three are true.
- Mon espace: centred identity (`IdentityHeader centered`), 88 pt portrait, greeting
  "Bienvenue dans votre atelier", name, company, centred chips; structure below unchanged.
- Tab bar: 70 pt bar, 24 pt icons, 11 pt labels, safe-area padding, + raised 28 pt.
- Nothing changed in auth, voice, purchases, ownership or backend contracts.
