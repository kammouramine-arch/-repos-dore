# Ressources de la fiche App Store

## Captures — `app-store/fr-FR/` et `app-store/en-US/`

Sept captures par langue, **1290 × 2796** (6,9 pouces), PNG **sans canal alpha**
— Apple refuse la transparence. Cette taille couvre l'ensemble des iPhone
récents dans App Store Connect ; les autres tailles en sont dérivées.

| # | Fichier (fr) | Titre | Écran montré |
| --- | --- | --- | --- |
| 1 | `01-voix.png` | PARLEZ. LE DEVIS SE CRÉE. | Accueil, micro au centre |
| 2 | `02-devis.png` | DU CHANTIER AU DEVIS | Liste des devis |
| 3 | `03-signature.png` | FAITES SIGNER. SUR PLACE. | Signature du client, tracé réel |
| 4 | `04-encaissement.png` | ENCAISSEZ SANS ATTENDRE | Factures et restant dû |
| 5 | `05-marque.png` | VOS DOCUMENTS. VOTRE MARQUE. | Réglages de marque avec aperçu |
| 6 | `06-recus.png` | SCANNEZ VOS REÇUS. | Dépenses et justificatifs |
| 7 | `07-clients.png` | VOS CLIENTS, AU MÊME ENDROIT | Répertoire clients |

La capture 1 est la plus importante : un artisan doit comprendre en cinq
secondes qu'il parle et que le devis se prépare. Elle reste en tête de série.

### Ce que ces images sont — et ne sont pas

Ce sont des **captures réelles de l'application**, prises sur le bundle exporté
avec un jeu de données de démonstration cohérent (une entreprise, quatre
clients, cinq devis, deux factures dont une réglée, quatre justificatifs).
Aucun écran n'a été redessiné, aucune valeur n'a été maquettée.

Trois formulations ont été écartées volontairement :

- pas de « en quelques secondes » : le temps de génération dépend du réseau et
  du fournisseur d'IA, et n'est pas garanti ;
- pas de logo Apple Pay ni de moyen de paiement non activé : seule la carte via
  Stripe est effectivement proposée, une fois l'artisan inscrit ;
- pas de « signature certifiée » ni « qualifiée » : il s'agit d'une acceptation
  électronique, et la capture montre la mention exacte affichée dans l'app.

### Régénérer la série

1. Base locale démarrée, API de développement sur le port 3000.
2. `cd mobile && npx expo export --platform web`
3. Captures : `node /tmp/.../shots.mjs` (Playwright, 430 × 932 en densité 3).
4. Composition : `node compose-shots.cjs` depuis la racine.

Le script de composition place le titre, le sous-titre et l'écran ; il aplatit
le résultat et retire le canal alpha.

## Marque — `brand/`

- `app-icon.svg` — source vectorielle de l'icône.
- `app-icon-1024.png` — icône App Store, 1024 × 1024, opaque.

L'icône reprend le D de DEVISERA : la hampe est une onde vocale, la panse est
une page de devis au coin replié. Elle se lit à 40 px comme à 1024. Les fichiers
de production vivent dans `mobile/assets/` (`icon.png`, `adaptive-icon.png`,
`splash-mark.png`, `notification-icon.png`, `favicon.png`) et le monogramme
affiché dans l'application reprend exactement la même géométrie
(`mobile/src/components/logo.tsx`).
