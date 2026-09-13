# App Review rejection fix — third-party AI consent (13 September 2026)

Build 40 (1.0.0 (40), submission d1653b51-e39e-4175-9133-5101f19e7930, reviewed on iPad Air
11-inch M3) was rejected under Guidelines 5.1.1 (i) and 5.1.2 (i): the app sent personal data
to a third-party AI service without telling the user what is sent, to whom, and why, without an
explicit permission step, and without describing it in the Privacy Policy.

## 1. Real AI providers and data flow (from production code, not guessed)

Provider selection lives in `src/lib/env.ts` (`aiProviderKind`) and `src/lib/ai/index.ts`.

| Provider | Company / service | Endpoint | Status |
| --- | --- | --- | --- |
| `gemini` | **Google LLC — Gemini API** | `https://generativelanguage.googleapis.com/{v1,v1beta}/models/gemini-*:generateContent` | **Active in production** (`/api/health` reports `ai.provider: gemini`, generation on, transcription off) |
| `anthropic` | Anthropic PBC — Claude API (`@anthropic-ai/sdk`) | api.anthropic.com | Integrated, **not active** (only if `ANTHROPIC_API_KEY` is set or `AI_PROVIDER=anthropic`) |
| `local` | none (`src/lib/ai/heuristic.ts`) | — | Fallback engine; nothing leaves DEVISERA |

Server-side transcription (`/api/ai/transcribe`) is disabled in production; iOS dictation runs
on-device (`mobile/src/features/voice.ts`) and only the resulting text is sent.

Features that send data to the provider, and the exact fields:

| Feature | Route / service | Data sent to Google Gemini |
| --- | --- | --- |
| Quote preparation (central +, text or dictated, with photos) | `POST /api/ai/quote` → `aiQuoteService.generateQuote` | Job description (`description_chantier`), up to 6 job-site photos (base64, if attached), business context: trade, hourly rate, VAT rate, usual terms, currency, country, language, up to 120 price-book entries (name, reference, category, unit, sale price, VAT) |
| Photo analysis | `POST /api/ai/analyse-photo` | Up to 6 photos, trade, optional description |
| Follow-up draft (quote detail → « Préparer une relance ») | `GET /api/quotes/[id]/relance` → `followUpService.draftFollowUpMessage` | Company legal name, **client name** (first/last or company), quote number, title, total TTC, viewed flag, attempt number, tone, client's reply (`message_client`) |
| Dashboard assistant (web only) | `POST /api/ai/assistant` → `assistantService.askAssistant` | The question, aggregated metrics, and for the largest / unanswered / closed quotes: number, title, amount, **client name**, client's reply |

Never sent: credentials, passwords, payment data, client email/phone/address, PDFs.
`AIRequest` rows store provider, model, latency and token counts only — not content.
`trackEvent('ai_generation')` writes to DEVISERA's own `analytics_events` table, not to a third party.

## 2. What changed

**Shared contract** — `packages/shared/src/ai-consent.ts`: `AI_CONSENT_VERSION = 1`, provider
names, `aiConsentGranted()` (GRANTED + current version + same provider), and the consent copy
(FR/EN) used verbatim by iOS and web. Changing text, provider or data requires bumping the version,
which re-prompts everyone.

**Database** — `AiConsent` (`ai_consents`): one row per user × organization with `status`
(GRANTED / DECLINED / REVOKED), `version`, `provider`, `decidedAt`. Nothing else is stored.
Migration `20260913120000_ai_consent` (RLS enabled like the other server tables). Applied by the
Vercel build (`scripts/migrate-hosted.mjs`).

**Server enforcement** — `aiConsentService.assertAiConsent` runs before the body is parsed and
before the rate limiter in `/api/ai/quote`, `/api/ai/analyse-photo`, `/api/ai/transcribe`; without
a valid consent the route answers `403 AI_CONSENT_REQUIRED` and no provider call happens. The
assistant answers from local data only, and the follow-up draft returns the local template
(`aiUsed: false`) without consent. The reviewer account cannot bypass this.

**API** — `GET/PUT /api/ai/consent`; the session DTO carries `aiConsent` so the app knows at launch.

**iOS** — `AiConsentProvider` (`mobile/src/lib/ai-consent.tsx`) mounted in the root layout renders
`AiConsentSheet` (`mobile/src/components/ai-consent-sheet.tsx`). `ensure()` is awaited before
both `api.ai.generateQuote` calls in `devis/nouveau.tsx` (first pass and after answering
questions, including retries) and before opening the follow-up sheet in `devis/[id].tsx`. Two
explicit buttons: « Autoriser et continuer » / « Pas maintenant »; no pre-checked box; closing the
sheet counts as declining. Decline: nothing is sent, the description and photos stay, a banner
explains that AI-assisted preparation needs permission and offers to ask again; the follow-up
still opens with a local template marked « Préparé sans IA ». A server `AI_CONSENT_REQUIRED`
answer (e.g. withdrawn on another device) resets the local state and re-prompts.

**Withdrawal** — Mon espace → « Confidentialité et données » → « Intelligence artificielle »
(`mobile/app/confidentialite-ia.tsx`): status, provider, data list, « Retirer mon autorisation »
(confirmation alert) / « Autoriser l’IA », link to the policy. After withdrawal every AI request
stops and the next AI action shows the sheet again.

**Web** — same gate (`src/components/app/ai-consent-gate.tsx`) on the new-quote flow, the
recorder and the assistant; Paramètres → « Intelligence artificielle » to allow / withdraw.

**Privacy Policy** — `https://devisera.fr/confidentialite` (the URL saved in App Store Connect)
now names Google LLC / Gemini API (and Anthropic as integrated-but-inactive), lists every data
category sent per feature and what is never sent, the purpose, the consent step, withdrawal paths,
retention (DEVISERA account data + content-free request log; Google per Gemini API terms),
deletion requests via contact@devisera.fr, and the equivalent-protection statement. Sub-processor
list now names Vercel, Supabase, Resend, Apple and Google.

## 3. App Store Connect → App Privacy re-audit

The unpublished draft (15 categories) must match the behaviour above. Check each item:

| Data type | Collected? | Linked to user | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact info — Name, Email, Phone | Yes (account, clients) | Yes | No | App functionality |
| User content — Photos or Videos | Yes (job-site photos; sent to Google Gemini with consent) | Yes | No | App functionality |
| User content — Other user content | Yes (job descriptions, quotes, client replies; sent to Google Gemini with consent) | Yes | No | App functionality |
| User content — Audio data | **No** (dictation stays on device; server transcription disabled) — remove if declared | — | — | — |
| Identifiers — User ID | Yes | Yes | No | App functionality |
| Purchases — Purchase history | Yes (Apple subscription state) | Yes | No | App functionality |
| Financial info | No (Apple handles payment) — remove if declared | — | — | — |
| Usage data — Product interaction | Yes (internal analytics_events) | Yes | No | Analytics |
| Diagnostics — Other diagnostic data | Yes (request IDs, error categories) | Yes | No | App functionality |
| Location, Health, Browsing history, Search history, Sensitive info | No | — | — | — |

No data is used for tracking or advertising; do not declare "Used to track you". Publish the
labels after this check.

## 4. App Review notes (paste into App Store Connect → App Review Information → Notes)

```
DEVISERA prépare des devis pour artisans. Correctif de la soumission précédente (5.1.1 / 5.1.2) :

• Fournisseur d'IA tiers : Google LLC, service Gemini API. Aucun autre fournisseur actif.
• Consentement explicite : à la première action assistée par IA, l'application affiche une
  feuille « Utilisation de l'intelligence artificielle » qui indique les données transmises
  (description du chantier, photos éventuelles, contexte de l'entreprise, et pour une relance
  le nom du client et le devis), le destinataire (Google, Gemini API) et la finalité. Deux
  boutons : « Autoriser et continuer » / « Pas maintenant ». Aucune donnée n'est envoyée avant
  cette autorisation ; le serveur refuse également toute requête sans autorisation enregistrée.
• Pour déclencher : connectez-vous avec le compte de revue, touchez le bouton central « + »,
  décrivez un chantier (ex. « Refaire la peinture du salon, 25 m² »), touchez « Préparer le
  devis ». La feuille de consentement s'affiche avant tout envoi. « Pas maintenant » laisse
  l'application utilisable ; les autres fonctions (clients, devis existants, PDF, email,
  abonnement) ne dépendent pas de l'IA.
• Retrait : Mon espace → Confidentialité et données → Intelligence artificielle →
  « Retirer mon autorisation ». La prochaine action IA redemande l'autorisation.
• Le compte de revue ne contourne pas ce consentement.
• Politique de confidentialité mise à jour (fournisseur, données, finalité, conservation,
  retrait, suppression) : https://devisera.fr/confidentialite

DEVISERA prepares quotes for trade professionals. This build fixes the previous rejection
(5.1.1 / 5.1.2): the third-party AI provider is Google LLC (Gemini API). Before the first
AI-assisted action the app shows an explicit consent sheet (what is sent, to whom, why) with
"Allow and continue" / "Not now"; nothing is sent before permission and the server also refuses
requests without a recorded permission. To trigger: sign in with the review account, tap the
central "+", describe a job, tap "Prepare the quote". Withdraw at My space → Privacy & data →
Artificial intelligence. The review account does not bypass consent. Privacy policy:
https://devisera.fr/confidentialite
```

## 5. Reply to Apple (Resolution Center)

```
Hello,

Thank you for the review. We have addressed Guidelines 5.1.1 (i) and 5.1.2 (i) in build 41:

1. Explicit consent before any personal data is shared with the third-party AI provider
   (Google LLC, Gemini API). Before the first AI-assisted action the app now presents a consent
   sheet that states exactly which data is sent (job description, optional job-site photos,
   business context; for follow-ups the client name and quote details), who receives it (Google,
   Gemini API) and why (to prepare the quote or message). The user must tap "Autoriser et
   continuer"; "Pas maintenant" sends nothing and leaves the rest of the app usable. The server
   additionally refuses AI requests without a recorded permission.
2. The permission can be withdrawn at any time in Mon espace → Confidentialité et données →
   Intelligence artificielle.
3. The Privacy Policy at https://devisera.fr/confidentialite now describes the data collected,
   the provider, the purpose, retention and deletion, the consent and withdrawal mechanism, and
   the provider's equivalent protection obligations.

Steps to reproduce: sign in with the review account, tap the central "+", enter a job
description and tap "Préparer le devis" — the consent sheet appears before any request.

Best regards,
DEVISERA
```

## 6. Resubmission checklist

1. Wait for Build 41 to finish processing in TestFlight (production profile, commit below).
2. App Store Connect → 1.0.0 → Build: remove build 40, attach build 41.
3. Keep subscriptions attached, availability France, release **manually**.
4. App Review Information: paste the notes from §4; keep the review account (it does not bypass consent).
5. App Privacy: apply §3 and publish.
6. Resolution Center: paste §5, then « Submit for Review ».

## 7. Verification

Root `tsc`, mobile `tsc`, root `eslint` on touched files, `expo lint`, unit suite 464 tests
(including `tests/unit/ai-consent.test.ts` and `tests/unit/mobile-ai-consent.test.ts`), full
suite with integration 588/588, production web build, production-profile iOS export.
Regression cases: no AI request before consent (route refuses, provider never called), allow →
proceeds, decline → nothing sent, persistence by user × organization with text version and
timestamp, withdrawal blocks, re-prompt on version/provider change, follow-up local template
without AI, text/voice/photo flows unchanged, PDF and email untouched.
