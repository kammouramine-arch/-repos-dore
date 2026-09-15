# Quote PDF polish and false "email not configured" fix — 10 September 2026

## 1. Why the app said "email not configured" after a successful send

Flow: `POST /api/quotes/[id]/envoi` → `sendQuote()` → `ResendProvider.send()` → provider
returns `{ delivered: true }` → the quote is marked sent, usage counted, follow-ups
scheduled → the route answered `{ quote, publicUrl, recipient }` **without** `delivered`,
although the shared client type declared it. The mobile screen tested `result.delivered`,
read `undefined`, and showed the failure toast. The email, PDF and follow-ups were all
real; only the response shape and the toast branch were wrong. The service throws
`PROVIDER_UNAVAILABLE` when the provider refuses, so a 200 already means acceptance.

Fix: the route now returns `delivered` and `emailProvider`; the app shows "Devis envoyé ·
Le devis a été envoyé à <adresse>" (success tone, animated check, success haptic) and only
shows an error on an explicit `delivered: false`. "Delivered" still means *accepted by the
provider*; no inbox-delivery claim is made, since no delivery webhook is consumed.

## 2. French devis conventions consulted

- Service-Public (entreprendre.service-public.gouv.fr/vosdroits/F31144): date, professional
  identity and address, client name, work location, exact nature of the service, detailed
  breakdown by quantity and price, offer validity, HT and TTC amounts with VAT rate, free or
  paid quote; for building and repair works: hourly labour rate TTC, time-count method,
  travel fees, and the information that the client may keep replaced parts; acceptance
  wording "bon pour accord" / "bon pour travaux" above the signature.
- DGCCRF (economie.gouv.fr, fiche pratique "Devis"): date, validity, service detail, HT
  amount + VAT rate + VAT amount per item, payment terms; most frequently omitted:
  validity, payment conditions.

Kept on the PDF: company identity block (name, contact, SIRET, VAT, insurance in the
footer), client block, number, issue date, validity, OBJET, designation table with
quantity / unit / unit price HT / VAT / total HT, totals HT → VAT → TOTAL TTC, deposit
when set, payment terms, conditions, "Bon pour accord" block with date and signature.
Added for France: the hourly-labour mention when a line is billed per hour, and the
replaced-parts mention. Fixed: the grand total was labelled "TOTAL HT" while showing the
TTC amount; it now reads "TOTAL TTC" (or "TOTAL" under VAT exemption).

## 3. Where the duplicated text came from

- Degraded engine (`heuristic.ts`, used whenever the AI call fails): `titre` = first
  clause of the dictation, `resume` = the whole dictation, `descriptionTravaux` = the
  dictation split into chunks, and the labour line said "temps estimé d'après votre
  description".
- Mobile creation (`devis/nouveau.tsx`): `summary = [draft.summary, ...workDescription]`
  joined, so the dictation appeared a second and third time in `summary`.
- Question answers (`applyAnswers`) were appended to the description and therefore echoed
  by the summary ("Quelle surface à peindre… ? 4 couches…").
- PDF (`drawObject`): title, then summary, then work list, all rendered.

## 4. Single source of truth now

| Concept | Field | Rule |
| --- | --- | --- |
| rawDescription | AI input only | never rendered on the document |
| quoteSubject | `quote.title` | concise nominal phrase, ≤ 64–80 chars, no conversational prefix, no question, no ellipsis |
| line items | `quote.items[].label/description` | professional designations; tasks render one per line |
| summary | `quote.summary` | at most two sentences, only if distinct from the subject and not an echo of the dictation; otherwise null |

`src/lib/ai/polish.ts` applies this to both the AI output and the degraded engine:
`recognizeWork()` maps common jobs to a subject and task list (siphon, chauffe-eau,
peinture, prises/plafonnier, porte, menuiseries, carrelage, WC, robinetterie, radiateur,
couverture, isolation, débouchage, climatisation…); `subjectFromSentence()` strips oral
prefixes ("le client veut", "il faut", "j'ai", "il y a"), nominalises the leading verb
("remplacer" → "Remplacement du", "repeindre" → "Remise en peinture"), cuts on a word
without ellipsis; `echoes()` drops any summary or item that restates the dictation;
`polishDraft()` dedupes work items already carried by the lines and never touches
quantities or prices. The AI prompt now states the same rules.

## 5. Examples

`pdf-examples-2026-09-10/`: plomberie, peinture, electricite, menuiserie (one page each),
long (3 pages, table header repeated), `before-after.jpg` (the real Build 37 PDF versus
the new plumbing quote), `sheet.jpg`.
