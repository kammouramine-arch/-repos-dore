# Build 55 — calques décollés, bandeau vivant, signature de l'entreprise, encaissement

Passation du 17/09/2026. Branche `claude/devisia-saas-build-4wthv7`, reportée
sur `integration/devisera-final` (commit `5628e12`). Build iOS 55, version
1.0.2, envoyé à TestFlight seulement — **pas** à la revue App Store.

## 1. Le voile gris sur toute l'application

L'enregistrement d'écran montrait chaque image assombrie, y compris les écrans
qui n'ouvrent aucune feuille.

Cause : `create-sheet.tsx` était un `Modal` contenant `<ClientSheet>`, lui-même
un `Modal`. Sur iOS le voile du modal extérieur survit à la fermeture du modal
intérieur : la vue disparaît, le calque reste. Rien dans l'arbre React ne le
signalait — d'où l'impression d'un problème de couleurs.

Correctif : la feuille n'existe plus. Le `+` mène directement au devis à la
voix (demande n° 1), ce qui supprime le modal imbriqué en même temps que
l'étape intermédiaire. Fichier supprimé, pas neutralisé.

## 2. La forme bleue figée en haut

`glass-tab-bar.tsx` : le halo d'appui montait à 1 sur `onPressIn` et aucune
valeur ne le ramenait à zéro. Au premier appui sur `+`, un disque bleu pâle à
double échelle se figeait au-dessus de l'interface, pour toute la session.

Correctif : `withSequence(withTiming(1), withTiming(0))`. La valeur finit à
zéro quoi qu'il arrive ensuite — navigation, perte de focus, démontage. Aucun
calque n'a été ajouté par-dessus.

## 3. Le bandeau bleu immobile

`brand-backdrop.tsx` était en position absolue par rapport à **l'écran**. Le
contenu défilait par-dessus un fond immobile : deux rectangles empilés, et des
intitulés gris traversant un champ bleu (d'où « CONFIDENTIALITÉ ET DONNÉES »
illisible, demande n° 12).

Correctif : le bandeau est piloté par le défilement.

- `useBrandScroll()` expose `scrollY` + un `useAnimatedScrollHandler` ;
- `Screen` accepte `onScroll` et bascule alors sur `Reanimated.ScrollView`
  (`scrollEventThrottle={1}`) ;
- le fond remonte à `0,72 ×` la vitesse du contenu, s'étire au tirage vers le
  bas, s'efface sur la fin de course ; l'en-tête s'efface en `0,45 ×` hauteur.

Tout est calculé sur le fil d'interface : rien ne traverse le pont JS.
Conséquence directe : un intitulé gris ne peut plus croiser du bleu, parce que
la blancheur du fond suit désormais la même course que le texte.

## 4. Signature de l'entreprise

La signature manuscrite livrée jusqu'ici était celle du **client**
(`QuoteSignature`, acceptation en ligne). Celle demandée est celle de
**l'entreprise**, apposée avant l'envoi.

- `BusinessProfile` porte `signatureStrokePath`, `signatureName`,
  `signatureDrawnAt` (migration `20260917100000_business_signature`,
  `ADD COLUMN IF NOT EXISTS`) ;
- tracée une fois dans **Ma marque → Ma signature**, appliquée à tous les
  documents émis ensuite ;
- `quote-pdf.ts` dessine « SIGNATURE DE L'ENTREPRISE » **avant** le bloc
  d'acceptation client — on lit d'abord qui s'engage ;
- quand l'entreprise a signé et le client non, le bloc d'acceptation se réduit
  à une ligne au lieu d'un cadre de 122 pt, pour ne pas pousser une page
  orpheline ;
- devis et factures partagent le même rendu (`quotePdfService.ts`).

Les deux signatures restent séparées en base, en code et dans l'interface.
Recueillir l'accord du client est devenu une action secondaire sur la fiche du
devis ; l'envoi redevient l'action principale.

Rien de tout cela n'est une signature électronique qualifiée au sens eIDAS, et
aucun écran ne le prétend.

## 5. Encaissement en ligne des factures

Le serveur savait déjà ouvrir une session de paiement et traiter le webhook
signé ; il manquait la page où le client atterrit et l'entrée dans
l'application.

- **Artisan** : Compte → Mon entreprise → Paiements → *Encaissement en ligne*
  (`mobile/app/encaissement.tsx`). Inscription Stripe Connect Express ; Stripe
  n'est nommé qu'à cet endroit, là où des coordonnées bancaires sont confiées.
- **Envoi** : sur une facture avec un solde, l'action *Encaisser* partage le
  lien public.
- **Client** : `/facture/<token>`, aux couleurs de l'artisan, bouton « Payer
  cette facture ». Aucun compte DEVISERA requis.

Garde-fous :

- le montant est **recalculé côté serveur** à partir de la facture, jamais
  transmis par le navigateur ;
- la confirmation vient du webhook **signé** (`payment_intent.succeeded`),
  jamais de la redirection de succès — `?paiement=recu` n'affiche qu'un accusé
  de réception ;
- `webhook_events` sert de verrou d'idempotence ;
- aucune donnée de carte ne transite par DEVISERA ; aucune clé secrète n'est
  embarquée dans l'application ;
- l'argent va sur le compte Connect de l'artisan, jamais sur le nôtre ;
- l'abonnement DEVISERA reste sur StoreKit sur iPhone : rien n'a été touché
  de ce côté.

### Ce qu'il reste à configurer chez Stripe

L'application est prête ; ces deux réglages vivent hors du dépôt.

1. **Webhook Connect** — Stripe → Développeurs → Webhooks → *Ajouter un point
   de terminaison*, en cochant **« Écouter les événements des comptes
   connectés »** :
   `https://devisia-bice.vercel.app/api/webhooks/stripe-connect`
   Événements : `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `charge.refunded`, `account.updated`.
2. **Variable Vercel** : `STRIPE_CONNECT_WEBHOOK_SECRET` = le secret de
   signature de ce point de terminaison (distinct de `STRIPE_WEBHOOK_SECRET`,
   qui couvre l'abonnement).

Vérification : `GET /api/health` renvoie désormais un bloc `payments` avec
`configured`, `mode` (`live` / `test`), `subscriptionWebhook`,
`connectWebhook` — des booléens, aucun secret. Tant que `connectWebhook` est
`false`, un client peut payer sans que la facture passe à « réglée ».

## 6. L'IA quitte la vitrine

La ligne « Intelligence artificielle · Autorisée » figurait au même rang que
l'abonnement : une information d'implémentation promue au rang de
fonctionnalité. Elle vit maintenant sous *Utilisation de vos données*, avec les
informations légales. L'autorisation reste due, reste explicite et reste
retirable — seule sa place a changé.

## 7. Un seul vocabulaire de mouvement

`mobile/src/theme/motion.ts` remplace les réglages au jugé :
`EASE_OUT = bezier(0.22, 1, 0.36, 1)`, `DURATION` plafonné à 420 ms, trois
ressorts (`select`, `press`, `panel`) dont aucun ne rebondit. Les écrans
touchés par cette passe s'y réfèrent ; les autres suivront sans rien casser.

## 8. Tarifs — état exact

Rien n'a changé et rien ne pouvait changer depuis ce dépôt. Le détail est dans
`docs/handoff/TARIFS_LANCEMENT.md` ; le résumé :

- `plans.ts` porte deux tables : `launchMonthlyPriceCents` (29,99 / 59,99 /
  99,99) et `legacyMonthlyPriceCents` (39 / 79 / 149) ;
- `effectiveMonthlyPriceCents()` renvoie la seconde tant que
  `LAUNCH_PRICING_LIVE` est faux ;
- l'appareil affiche un repli de vitrine parce que StoreKit renvoie une devise
  incohérente avec la vitrine FRA (dossier Apple 102957593166) — d'où
  « Tarif France · Apple confirme le prix avant votre accord » ;
- le repli est **dérivé** de `plans.ts`, jamais recopié.

Il faut donc **deux** actions, pas une :

1. repricer les trois produits dans App Store Connect (29,99 / 59,99 / 99,99) ;
2. poser `EXPO_PUBLIC_LAUNCH_PRICING=1` (et `NEXT_PUBLIC_LAUNCH_PRICING=1` côté
   web) puis reconstruire.

Faire la première seule laisserait le repli annoncer 39 / 79 / 149 ; faire la
seconde seule annoncerait un prix non pratiqué — donc un refus App Store.

La métadonnée StoreKit réelle d'un appareil ne peut être lue que sur cet
appareil. Le pied du message au support (Compte → Nous écrire) porte désormais,
pour chacun des trois identifiants produit, le `displayPrice` et la `currency`
renvoyés par StoreKit, plus la vitrine. Rien de cela n'est affiché dans
l'interface.

## Vérifications

`tsc` web et mobile, `eslint`, `expo lint`, `next build`, 680 tests unitaires
et d'intégration (95 fichiers), 16 tests de bout en bout. Revue visuelle à
393 × 852 et 430 × 932 sur base de données réelle. PDF généré et rendu pour
vérifier le bloc de signature — une seule page.
