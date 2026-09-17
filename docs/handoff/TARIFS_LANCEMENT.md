# Tarifs de lancement — procédure exacte

Référencé par `packages/shared/src/plans.ts` (`LAUNCH_PRICING_LIVE`) et par
`packages/shared/src/apple-storefront-prices.ts`.

## Ce que le code fait aujourd'hui

`plans.ts` porte deux tables de prix par formule :

| Formule | `legacyMonthlyPriceCents` | `launchMonthlyPriceCents` |
| --- | --- | --- |
| Essentiel | 3900 (39 €) | 2999 (29,99 €) |
| Pro | 7900 (79 €) | 5999 (59,99 €) |
| Entreprise | 14900 (149 €) | 9999 (99,99 €) |

`effectiveMonthlyPriceCents(plan)` renvoie la colonne de gauche tant que
`LAUNCH_PRICING_LIVE` est faux, la colonne de droite ensuite. Le drapeau est
levé par `NEXT_PUBLIC_LAUNCH_PRICING=1` (web) ou `EXPO_PUBLIC_LAUNCH_PRICING=1`
(application), jamais autrement : aucun montant n'est écrit en dur ailleurs.

Le repli de vitrine française (`apple-storefront-prices.ts`) est **dérivé** de
cette fonction. C'est délibéré : deux tables de prix indépendantes avaient
divergé en août, et l'application annonçait un tarif que le magasin ne
pratiquait pas.

## Pourquoi l'iPhone affiche encore 39 / 79 / 149

Deux raisons se superposent.

1. Les trois produits d'App Store Connect portent réellement ces prix. C'est
   ce qui est facturé.
2. L'appareil n'affiche pas la métadonnée StoreKit mais le repli de vitrine,
   parce que StoreKit renvoie une devise incohérente avec la vitrine FRA
   (dossier Apple 102957593166). D'où la mention « Tarif France · Apple
   confirme le prix avant votre accord ». Dès que StoreKit renvoie `EUR` pour
   une vitrine `FRA`, `displayPrice` reprend la main et ce fichier n'est plus
   lu.

Conséquence à retenir : **repricer chez Apple ne suffit pas** à changer ce que
l'application affiche, tant que le repli est actif.

## Procédure

### 1. App Store Connect

App Store Connect → **DEVISERA** (app id 6806865251) → *Abonnements* → groupe
**22361541**. Pour chacun des trois produits :

| Identifiant produit | Prix cible |
| --- | --- |
| `fr.devisia.essentiel.monthly` | 29,99 € / mois |
| `fr.devisia.pro.monthly` | 59,99 € / mois |
| `fr.devisia.entreprise.monthly` | 99,99 € / mois |

*Tarification et disponibilité* → choisir le palier France correspondant →
enregistrer. Apple recalcule les autres vitrines à partir du palier ; ne pas
saisir les montants vitrine par vitrine.

Une baisse de prix s'applique aux abonnés existants sans action de leur part.
Une hausse exigerait leur consentement explicite — ce n'est pas le cas ici,
les trois montants baissent.

Attendre que les trois produits affichent le nouveau prix dans App Store
Connect avant l'étape 2. Les lever dans l'autre ordre ferait annoncer par
l'application un prix qu'Apple ne pratique pas encore : c'est un motif de
refus, et c'est trompeur pour le client.

### 2. Lever le drapeau

- Vercel → projet DEVISERA → *Environment Variables* :
  `NEXT_PUBLIC_LAUNCH_PRICING=1`, puis redéployer.
- `mobile/eas.json`, profil `production` → `env.EXPO_PUBLIC_LAUNCH_PRICING="1"`,
  puis nouveau build TestFlight.

Les deux sont nécessaires : le site et l'application lisent deux variables
distinctes, et le build iOS fige la sienne à la compilation.

### 3. Stripe (web)

Les abonnements souscrits sur le web passent par Stripe. Créer les trois
nouveaux prix, puis mettre à jour `STRIPE_PRICE_ESSENTIEL`,
`STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTREPRISE` sur Vercel. Les abonnements en
cours gardent leur prix jusqu'à migration explicite.

## Vérification

- Sur appareil : la mention de repli disparaît si StoreKit est redevenu
  cohérent ; sinon le repli affiche désormais 29,99 / 59,99 / 99,99, dérivé de
  la même table.
- Le pied du message au support (Compte → Nous écrire) porte la vitrine et,
  pour chaque identifiant produit, le `displayPrice` et la `currency` réellement
  renvoyés par StoreKit. C'est le seul moyen de lire cette métadonnée : elle
  n'existe que sur l'appareil, aucun serveur ne peut l'interroger.
- `tests/unit/apple-offer.test.ts` vérifie que le repli suit le drapeau et
  qu'aucune conversion de devise n'est jamais calculée.
