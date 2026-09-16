# DEVISERA — passage au produit vocal (2026-09-16)

« Je parle. DEVISERA fait l'administratif. »

Ce document décrit ce qui a été construit, ce qui reste à faire de votre côté,
et ce que le produit ne prétend surtout pas faire.

## Le parcours, d'un bout à l'autre

1. L'artisan ouvre l'application. Le micro occupe le centre de l'accueil, sous
   « Que voulez-vous chiffrer aujourd'hui ? ».
2. Il décrit le chantier à voix haute. Le texte s'affiche pendant qu'il parle.
3. À l'arrêt, la transcription part vers l'écran de devis, qui enchaîne la
   génération sans second geste.
4. Il relit les lignes, corrige, choisit le client, enregistre.
5. Le client signe du doigt sur le téléphone, sur place.
6. Le devis signé devient une facture, sans ressaisie.
7. Le client règle en ligne ; le webhook Stripe met la facture à jour.
8. Les justificatifs sont photographiés, relus, classés.
9. L'export comptable produit trois CSV datés.

## Ce qui est en place et vérifié

| Domaine | État |
| --- | --- |
| Accueil vocal | Micro central, forme d'onde pilotée par la détection réelle de parole, minuteur, haptique, annulation, secours manuel |
| Signature client | Tracé vectoriel, acceptation explicite, empreinte du devis, invalidation si le devis change |
| Facturation | Conversion depuis un devis accepté, lignes figées, numérotation, PDF |
| Encaissement | Stripe Connect, page publique, webhooks vérifiés et idempotents, règlements partiels, échecs, remboursements |
| Reçus et dépenses | Lecture IA relue avant enregistrement, champs illisibles signalés, postes de dépense |
| Export comptable | CSV ventes / dépenses / encaissements, séparateur point-virgule, UTF-8 avec BOM |
| Marque | Trois modèles, couleur, pied de page, coordonnées de règlement, aperçu |
| PDF | Devis et facture, trois modèles, signature imprimée, acompte, restant dû |
| Icône et captures | Nouvelle icône, sept captures par langue en 1290 × 2796 |

## Ce que le produit ne prétend pas

- **La signature n'est pas qualifiée au sens eIDAS.** Aucune autorité de
  certification n'intervient et l'identité du signataire n'est pas vérifiée.
  L'écran et le PDF disent « acceptation électronique ». Ne pas le reformuler
  en « signature certifiée » dans une communication commerciale.
- **Aucune durée de génération n'est promise.** Elle dépend du réseau et du
  fournisseur d'IA.
- **Aucun moyen de paiement non activé n'est montré.** Seule la carte via
  Stripe est proposée, et seulement après inscription de l'artisan.
- **L'IA ne complète jamais un justificatif illisible.** Un champ qu'elle n'a
  pas su lire reste vide et est signalé à l'artisan.

## Ce qui demande une action de votre part

### 1. Stripe Connect — encaissement des factures (obligatoire pour cette fonction)

L'encaissement par le client de l'artisan est implémenté mais inactif tant que
ces deux réglages ne sont pas faits :

1. Dans le tableau de bord Stripe, activer **Connect** et le type de compte
   **Express** pour la France.
2. Créer un point de terminaison webhook vers
   `https://devisia-bice.vercel.app/api/webhooks/stripe-connect`, en écoutant
   **les événements des comptes connectés** (et non du compte plateforme) :
   `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `charge.refunded`, `account.updated`.
3. Copier le secret de signature de ce point de terminaison dans la variable
   Vercel `STRIPE_CONNECT_WEBHOOK_SECRET`.

Sans ces réglages, l'écran de paiement répond « Cette entreprise n'accepte pas
encore le paiement en ligne » — ce qui est exact — et rien n'est facturé.

Ce webhook est **distinct** de `STRIPE_WEBHOOK_SECRET`, qui couvre
l'abonnement DEVISERA. Ne pas réutiliser le même secret.

### 2. Tarifs de lancement — 29,99 € / 59,99 € / 99,99 €

Le code porte les deux tarifs. Tant que `LAUNCH_PRICING_LIVE` est faux,
l'application affiche le tarif **réellement facturé** (39 / 79 / 149 €).
Afficher le tarif de lancement avant de l'avoir appliqué reviendrait à annoncer
un prix que nous ne pratiquons pas, et à risquer un refus App Store.

Pour basculer :

1. **App Store Connect** → Abonnements → groupe `22361541` → pour chacun des
   trois produits existants (`fr.devisia.essentiel.monthly`,
   `fr.devisia.pro.monthly`, `fr.devisia.entreprise.monthly`), modifier le prix
   de la vitrine **France** vers 29,99 € / 59,99 € / 99,99 €. **Ne créez pas de
   nouveaux produits** : les abonnés actuels sont rattachés à ceux-ci.
   Apple demandera si les abonnés existants conservent leur tarif — répondre
   selon votre choix commercial ; une baisse de prix s'applique généralement
   sans action de leur part.
2. **Stripe** → créer un nouveau Price pour chaque produit aux mêmes montants,
   puis mettre à jour `STRIPE_PRICE_ESSENTIEL`, `STRIPE_PRICE_PRO` et
   `STRIPE_PRICE_ENTREPRISE` sur Vercel.
3. Mettre `NEXT_PUBLIC_LAUNCH_PRICING=1` sur Vercel et
   `EXPO_PUBLIC_LAUNCH_PRICING=1` sur EAS, puis redéployer et rebuilder.

Sur iPhone, le prix affiché vient de toute façon de StoreKit : dès l'étape 1,
le paywall montre le bon prix sans attendre les étapes 2 et 3.

### 3. Offre d'essai de 7 jours sur iPhone

`TRIAL_DAYS = 7` régit l'essai **web** uniquement. Sur iPhone, l'essai provient
de l'offre d'introduction déclarée dans App Store Connect, et le paywall ne
l'annonce que si Apple la confirme. Pour proposer 7 jours sur iPhone, créez ou
modifiez l'**offre d'introduction « essai gratuit »** de chaque produit à
7 jours. Aucun changement de code n'est nécessaire.

### 4. Lecture des justificatifs

La lecture IA des reçus utilise le fournisseur déjà configuré (`AI_PROVIDER`).
Si aucun fournisseur n'est actif, l'écran propose la saisie manuelle et le dit.
Aucune clé supplémentaire n'est requise.

## Vérifications passées

| Vérification | Résultat |
| --- | --- |
| `npx tsc --noEmit` (racine) | propre |
| `npx tsc --noEmit` (mobile) | propre |
| `npx eslint src packages/shared/src tests` | propre |
| `npx expo lint` | propre |
| Tests unitaires | 520 |
| Tests d'intégration du cycle facture | 10 |
| `npx playwright test` | 16 |
| `npm run build` | OK |
| `npx expo-doctor` | seule la note préexistante « paquets non à jour » |
| `npx expo prebuild --platform ios` | entitlement Sign in with Apple présent, `CFBundleLocalizations` fr + en, icône 1024 présente |

## Version et build TestFlight

**Version portée de 1.0.1 à 1.0.2.**

Le build 49 (1.0.1) a été produit correctement — IPA généré, profil et
entitlements en ordre — mais App Store Connect a refusé l'envoi :

> `SUBMISSION_SERVICE_IOS_OLD_APP_VERSION` — You've already submitted this
> version of the app. Versions are identified by CFBundleShortVersionString.

La version 1.0.1 est donc fermée à de nouveaux envois côté Apple, ce qui
arrive une fois qu'une version a été soumise à validation ou publiée. Le
remède est celui qu'indique le message lui-même : incrémenter la version. Le
build livré est donc **1.0.2**, et c'est celui à installer depuis TestFlight.
Le numéro de build reste géré par EAS en versionnage distant.

| | |
| --- | --- |
| Version | 1.0.2 |
| Build | 50 |
| EAS | `92484942-3e5c-44a5-8720-716b77438e95` — terminé, IPA produit |
| Soumission | `83f77f74-baa4-4b36-a526-b9f340cb758e` — terminée, acceptée par Apple |
| Commit | `fce2708` |

Le build 49 (1.0.1, EAS `833585a7`) reste consultable sur EAS : il s'est
construit sans erreur, seul l'envoi a été refusé. Il n'y a rien à en tirer.

## Deuxième passe — ce qui était invisible

Le reproche était fondé : factures, dépenses, marque et signature étaient
codées mais joignables uniquement en tapant une adresse, et l'écran d'export
comptable n'existait pas. Une fonction qu'on ne trouve pas n'existe pas.

| Fonction | Où elle se trouve maintenant |
| --- | --- |
| Factures | Mon espace → **Votre activité** → Factures |
| Reçus et dépenses | Mon espace → **Votre activité** → Reçus et dépenses |
| Export comptable | Mon espace → **Votre activité** → Export comptable |
| Marque et logo | Mon espace → **Votre activité** → Ma marque |
| Faire signer | Fiche du devis → bouton principal, tant que le devis n'est pas accepté |
| Créer la facture | Fiche du devis accepté → bouton principal |

« Votre activité » est la **première** section de Mon espace, avant les
réglages de compte : elle est visible sans défiler.

Ajouts de cette passe :

- Écran d'export comptable (il n'existait pas) : période, aperçu chiffré
  avant envoi, trois CSV remis à la feuille de partage d'iOS.
- Téléversement du logo dans Ma marque, réduit et converti en PNG, avec
  aperçu du document montrant où il apparaîtra.
- PDF : police incorporée et sous-ensemblée — l'euro, les apostrophes
  courbes et les ligatures sortent enfin correctement, sans l'approximation
  que le jeu CP1252 imposait. Bandeau de couleur en tête, logo en haut à
  droite sur pastille blanche, bloc de totaux plein avec le total dans une
  bande de couleur, zone de signature à deux repères datés.

## Build 51

| | |
| --- | --- |
| Version | 1.0.2 |
| Build | 51 |
| EAS | `a59c86a6-0d6a-4373-9c25-586220204456` — terminé, IPA produit |
| Soumission | `cd4fef79-bd4e-4322-ae84-4216ea8b2ee9` — terminée, acceptée par Apple |
| Commit | `69b5c3b` |

C'est ce build qu'il faut installer : les builds 49 et 50 n'ont pas la
navigation corrigée.

## À tester sur iPhone réel

1. **Installation propre** — désinstaller l'app, installer depuis TestFlight,
   vérifier la nouvelle icône sur l'écran d'accueil.
2. **Onboarding** — trois écrans : parler, faire signer et facturer, encaisser
   et classer.
3. **Inscription et connexion** — Apple, Google si configuré, e-mail avec code.
4. **Essai et paywall** — durée annoncée, prix en euros, renouvellement,
   chemin d'annulation, restauration d'achat.
5. **Micro** — autorisation demandée une fois, refus géré, réglages accessibles.
6. **Dictée** — le texte s'affiche pendant qu'on parle, la forme d'onde bouge
   quand on parle et se repose dans le silence, le minuteur avance, l'annulation
   revient sans message.
7. **Génération** — la transcription part toute seule vers l'écran de devis et
   la préparation démarre sans second geste.
8. **Édition** — corriger une ligne, un prix, une quantité ; choisir le client.
9. **PDF** — logo, mentions légales, lignes, TVA, acompte, pied de page.
10. **Envoi du devis** — au client, lien public consultable.
11. **Signature** — passer le téléphone, signer au doigt, cocher l'acceptation,
    valider ; le devis passe à « accepté ».
12. **Facture** — créée depuis le devis signé, numérotée, PDF correct.
13. **Paiement en ligne** — seulement après les réglages Stripe Connect
    ci-dessus ; sinon l'écran dit que ce n'est pas encore proposé.
14. **Statut de paiement** — la facture bascule après règlement.
15. **Scan de reçu** — photographier un ticket, vérifier que les champs non
    lisibles sont signalés et non inventés, corriger, enregistrer.
16. **Dépenses** — total, TVA, classement par poste.
17. **Export comptable** — période choisie, CSV lisibles.
18. **Marque** — changer de modèle et de couleur, vérifier l'aperçu puis le PDF.
19. **Fiche client** — ouverture fiable, devis rattachés.
20. **Bouton + central** — création depuis n'importe quel onglet.
21. **Équipe** — inviter, changer un rôle (formule Entreprise).
22. **Langues** — basculer français / anglais, quitter l'app, rouvrir : le choix
    tient.
23. **Arrière-plan** — quitter en pleine dictée, revenir ; le micro ne reste pas
    ouvert.
24. **Réseau** — mode avion : messages d'erreur clairs, pas d'écran mort.
25. **Confidentialité** — suppression du compte, retrait du consentement IA,
    export personnel.

## Migration de base

`prisma/migrations/20260916100000_voice_first_lifecycle` est écrite pour être
rejouable : chaque ajout est gardé par `IF NOT EXISTS` ou par un bloc
d'exception. Les tables existantes `invoices` et `payments` sont complétées
sans perte : `publicToken` est ajouté nullable, rempli pour les lignes
existantes, puis rendu obligatoire.

---

# Passe de correction — build 52 (2026-09-16, soir)

## Le numéro de build réel

Le retour d'essai parlait du « build 49 ». Ce n'est pas celui qui a été testé :
le build 49 (1.0.1) a bien été *construit*, mais sa soumission a été **refusée**
par App Store Connect (`SUBMISSION_SERVICE_IOS_OLD_APP_VERSION`) et il n'a
jamais atteint TestFlight. L'état réel chez EAS au moment de cette passe :

| Build | Version | Construction | Soumission |
| --- | --- | --- | --- |
| 52 | 1.0.2 | cette passe | à installer |
| 51 | 1.0.2 | terminée | terminée, acceptée |
| 50 | 1.0.2 | terminée | terminée, acceptée |
| 49 | 1.0.1 | terminée | **refusée** |
| 48, 47 | 1.0.1 | terminées | terminées |

La capture envoyée montre « VOTRE ACTIVITÉ » avec Factures, Reçus, Export
comptable et Ma marque : ce groupe n'existe que depuis le commit `69b5c3b`,
donc l'appareil tournait bien sous **le build 51**. Le prochain build valide
est donc **52**, pas 50.

## D'où venaient réellement 39 / 79 / 149 €

Pas d'un libellé codé en dur dans le paywall, et pas de `plans.ts` non plus.
Enchaînement exact :

1. App Store Connect facture aujourd'hui 39 / 79 / 149 € pour les trois
   produits. C'est le tarif réel, relevé dans l'écran natif de gestion
   d'abonnement d'Apple.
2. StoreKit renvoie pour cet appareil une devise qui contredit sa vitrine
   (FRA + USD, dossier Apple 102957593166).
3. `appleOffer()` détecte la contradiction et affiche le prix public vérifié de
   la vitrine française plutôt qu'une conversion — d'où la mention « Tarif
   France · Apple confirme le prix avant votre accord » visible sur la capture.

Le défaut corrigé ici n'est donc pas un prix faux, c'est une **table de prix en
double** : `apple-storefront-prices.ts` recopiait des montants que `plans.ts`
portait déjà. Elle les **dérive** désormais de `effectiveMonthlyPriceCents()`,
et un test échoue si quelqu'un les recopie à nouveau.

**Rien n'a été modifié chez Apple, et rien ne pouvait l'être :** cet
environnement n'a aucune clé App Store Connect sur disque, aucune variable
d'environnement Apple, et l'API d'App Store Connect y répond 401. La clé
« DEVISIA EAS » (UYGAWWUX8D) vit sur les serveurs EAS et n'est injectée que
dans les jobs de build et de soumission. La procédure manuelle reste celle du
paragraphe « Tarifs de lancement » plus haut.

Une fois les trois produits repricés chez Apple, le paywall iPhone affiche le
nouveau tarif **sans rebuild** : il lit `displayPrice` de StoreKit. Le repli,
lui, suivra au rebuild suivant une fois `EXPO_PUBLIC_LAUNCH_PRICING=1` posé.

## Où vivent les fonctions, maintenant

| Fonction | Chemin dans l'interface |
| --- | --- |
| Devis | Onglet **Documents** → segment « Devis » |
| Factures | Onglet **Documents** → segment « Factures » |
| Reçus et dépenses | Onglet **Outils** → carte « Reçus et dépenses » · aussi en accès rapide sur l'accueil |
| Export comptable | Onglet **Outils** → carte « Export comptable » · aussi en accès rapide |
| Ma marque | Onglet **Outils** → carte « Ma marque » · aussi en accès rapide |
| Catalogue, chiffre d'affaires, encaissement | Onglet **Outils** → « Utile aussi » |
| Compte, entreprise, abonnement, langue, légal | Onglet **Outils** → « Mon compte » |
| Signature client | Écran d'un devis → « Faire signer le client » → « Signer ici » |
| Facturer un devis signé | Écran d'un devis accepté → « Créer la facture » |

« Mon espace » ne porte plus aucune fonction du métier : les mêmes liens en
double auraient laissé hésiter sur le bon chemin.

## Le verre

La barre de navigation utilise `UIGlassEffect` d'iOS 26 par
`expo-glass-effect`. Trois niveaux, décidés à l'exécution et non à la
compilation :

1. `isLiquidGlassAvailable()` vrai → verre natif, avec `GlassContainer` pour la
   fusion des formes ;
2. sinon → `BlurView`, matériau système ;
3. « Réduire la transparence », Android ou web → surface opaque.

La sélection est une capsule qui **glisse** d'une destination à l'autre
(ressort Reanimated), pendant que l'icône passe du contour au plein. « Réduire
les animations » la pose directement à destination. Aucun rectangle
semi-transparent bordé de blanc : un test le vérifie.

## La signature

L'ancien cadre tenait 200 points de haut au milieu d'une vue défilante, qui
volait le geste dès qu'il descendait ; le trait était une suite de segments
droits ; et une fois raté, il fallait tout effacer. Trois défauts, et un
quatrième invisible : x et y étaient normalisés séparément, donc une signature
tracée dans un cadre plus haut que 5:2 **ressortait écrasée sur le PDF**.

Maintenant : feuille plein écran, trait lissé par quadratiques, retour arrière
trait par trait, tout effacer, annuler, validation qui refuse une paume posée
sur l'écran (`isSignature`), et une échelle unique sur les deux axes.

Sur le PDF, le tracé est cadré sur sa **boîte englobante** et non sur un repère
vide : l'encre sort à sa taille, à côté du nom et de la date, dans la couleur
de l'artisan. La mention imprimée reste « acceptation électronique » — un test
vérifie qu'aucune chaîne imprimée ne dit « qualifiée » ou « certifiée ».

## Ce qui n'a pas changé, volontairement

- Aucun tarif n'a été modifié chez Apple ni chez Stripe.
- La signature n'est toujours pas qualifiée au sens d'eIDAS, et ne le prétend
  nulle part.
- L'encaissement en ligne reste inactif tant que Stripe Connect n'est pas
  activé (voir plus haut).
- Aucune soumission à la validation App Store : TestFlight uniquement.
