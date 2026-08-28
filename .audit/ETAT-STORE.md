> ⚠ Ce relevé date d'avant l'audit de pré-lancement. Voir `AUDIT-PRELANCEMENT.md`
> pour l'état corrigé. En particulier : le thème ONDÉE **est** publié (rôle MAIN),
> contrairement à ce qui est indiqué plus bas.

# État du store ONDÉE — 28/08/2026 (source : API Admin Shopify)

Store : Ondee · krjwiu-zv.myshopify.com · EUR · France · Basic
Mot de passe boutique : ACTIVÉ (storefront non public)
taxesIncluded: true · taxShipping: false · weightUnit: KILOGRAMS
paymentSettings.supportedDigitalWallets: [] (AUCUN moyen de paiement actif)
contactEmail: kammouramine1010@gmail.com (≠ bonjour@ondee.fr utilisé partout sur le site)

## Thèmes
- Horizon — MAIN (publié, thème Shopify par défaut)
- "À SUPPRIMER — copie Horizon inutilisée" — UNPUBLISHED
- "À SUPPRIMER — ONDÉE v1 (remplacée)" — UNPUBLISHED
- **ONDÉE** — UNPUBLISHED ← le thème à publier (76 fichiers)

## Produits (3, tous ACTIVE, tous mediaCount = 0, featuredMedia = null)
### ondee-filtre-de-douche — "ONDÉE — Filtre de douche"
| SKU | Variante | Prix | Barré | Stock | Poids |
|---|---|---|---|---|---|
| ONDEE-F1 | Filtre + 1 cartouche | 59,00 | — | 40 | 450 g |
| ONDEE-SET | Set complet — filtre + pomme de douche | 79,00 | — | 40 | 750 g |
| ONDEE-SET-AN | L'année complète — set + 4 cartouches | 109,00 | 155,00 | 15 | 2150 g |
| ONDEE-DUO | Duo — 2 sets + 2 cartouches | 149,00 | 196,00 | 5 | 2300 g |

### ondee-cartouche-c90 — "ONDÉE — Cartouche filtrante C90"
| C90-1 | À l'unité — 3 mois | 19,00 | — | 60 | 400 g |
| C90-2 | Lot de 2 — 6 mois | 34,00 | 38,00 | 40 | 800 g |
| C90-4 | Lot de 4 — 12 mois | 59,00 | 76,00 | 25 | 1600 g |
| C90-ABO | Abonnement — 2 cartouches tous les 6 mois | 29,00 | 38,00 | 50 | 800 g |

### ondee-bandelettes-test-chlore
| TEST-10 | Lot de 10 | 9,00 | — | 100 | 40 g |

Toutes variantes : inventoryPolicy DENY, taxable true, tracked true, requiresShipping true.

## Collections
frontpage (1) · filtres (1) · cartouches (2) · tout (3) — toutes publiées

## Pages
PUBLIÉES : contact, mon-eau, ce-que-ondee-ne-fait-pas, la-maison, livraison-retours
BROUILLON (contiennent des marqueurs [[...]]) : mentions-legales (16), confidentialite (4), cgv (6)

## Menus
main-menu : Mon eau · Le filtre · Cartouches · Ce qu'on ne fait pas · La maison
footer : Le filtre ONDÉE · Cartouches C90 · Rapport d'eau · Ce qu'ONDÉE ne fait pas · La maison · Livraison & retours · Contact · CGV · Mentions légales · Confidentialité
⚠️ Le footer pointe vers 3 pages EN BROUILLON → 404 pour les visiteurs.

## Livraison (profil General)
France : Point relais Mondial Relay 4,90 € (0–49 €) · Colissimo à domicile 5,90 € (0–49 €) · Livraison offerte 0 € (≥ 49 €)
UE : Colissimo International 9,90 € (26 pays)
Hors UE : désactivé

## Politiques boutique (checkout)
Seule PRIVACY_POLICY existe — texte Shopify PAR DÉFAUT, EN ANGLAIS.
Aucune politique de remboursement, de livraison ni de CGV au checkout.
Le scope write_legal_policies est REFUSÉ au connecteur → non corrigeable par API.

## Test de commande (créé puis supprimé)
Set complet, Lille 59000 → sous-total 79,00 € · livraison 0,00 € · TVA 0,00 € · total 79,00 €
⚠️ Aucune ligne de TVA calculée. taxesIncluded=true mais aucune taxe collectée.
