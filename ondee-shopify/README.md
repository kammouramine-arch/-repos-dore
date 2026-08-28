# Thème Shopify ONDÉE — v1.0.0

Thème complet, sans dépendance JavaScript, conçu pour la boutique ONDÉE.
**Validé par `theme-check` : 0 erreur, 0 avertissement, 0 info.**

## Installation

1. Téléchargez **`../ondee-theme.zip`** (à la racine du dépôt).
2. Admin Shopify → **Boutique en ligne → Thèmes → Ajouter un thème → Importer un fichier zip**.
3. Le thème apparaît dans « Thèmes de la bibliothèque ». **Aperçu** d'abord, publication ensuite.

> Ne publiez pas avant d'avoir créé les produits : la section « L'offre » de la
> page d'accueil a besoin qu'un produit lui soit assigné.

## Ce que contient le thème

| Dossier | Contenu |
|---|---|
| `layout/` | `theme.liquid`, `password.liquid` |
| `templates/` | accueil, produit, collection, panier, page, contact, recherche, 404, blog, article, mot de passe, carte cadeau, et les 7 gabarits client |
| `sections/` | 30 sections, dont 13 personnalisables depuis l'éditeur Shopify |
| `snippets/` | tiroir panier, lignes de panier, carte produit |
| `config/` | palette, réassurance, réseaux sociaux |
| `locales/` | `fr.default.json` (traduction complète) |
| `assets/` | CSS, JS, 8 visuels SVG, 6 polices auto-hébergées |

## Sections personnalisables

Barre d'annonce · En-tête · Héros · Bandeau chiffres · **Rapport d'eau** ·
Problème → solution · Étapes · Démonstration technique · Bénéfices · L'offre ·
Avant/après · Preuve sociale · Avis clients · FAQ · Garantie · CTA final · Pied de page

## Le rapport d'eau — la pièce maîtresse

Section `rapport-eau`. Interroge en direct, **depuis le navigateur du visiteur**,
deux API publiques françaises. **Aucune clé, aucun backend, aucun coût, aucun cookie.**

| API | Rôle |
|---|---|
| `geo.api.gouv.fr` | Commune / code postal → code INSEE |
| `hubeau.eaufrance.fr` | Relevés SISE-Eaux du ministère de la Santé |

Paramètres affichés : dureté (TH), chlore libre, chlore total, trihalométhanes,
conformité du dernier prélèvement, date et distributeur.

**Testé sur données réelles** (26-28 août 2026) :

| Commune | Dureté | Chlore libre | Verdict affiché |
|---|---|---|---|
| Lille (59350) | 37,6 °f — très dure | 0,20 mg/L | « ONDÉE retire le chlore » **+** « ONDÉE ne retire pas les 37,6 °f » |
| Toulouse (31555) | 9,4 °f — douce | 0,24 mg/L | « Le calcaire n'est pas votre sujet » |

L'outil **déconseille l'achat** quand le chlore relevé est sous 0,05 mg/L.
Ce n'est pas décoratif : c'est le cœur du positionnement.

> **Conservez la mention de source.** Les données sont publiques, mais les
> afficher sans citer SISE-Eaux / Hub'Eau ruinerait la crédibilité qui justifie
> l'outil.

## Performance

- **Zéro dépendance JS** — pas de jQuery, pas de framework, un seul fichier de 22 Ko.
- **Polices auto-hébergées** (woff2, `font-display:swap`, `preload_tag` sur les
  deux plus critiques) — aucune requête vers Google Fonts, aucun blocage de rendu.
- Script en `defer`, images dimensionnées, `fetchpriority="high"` sur le héros,
  `loading="lazy"` ailleurs.
- Animations neutralisées sous `prefers-reduced-motion`.

## Réglages du thème

Éditeur → **Paramètres du thème** :
- **Couleurs** — palette ONDÉE complète.
- **Réassurance** — seuil de port offert, délai d'expédition, durée d'essai, e-mail.
- **Réseaux sociaux** — Instagram, TikTok.

> **La règle à ne jamais enfreindre :** l'ambre `#D89B22` est la couleur de la
> bandelette de test. Elle ne sert **qu'à afficher une mesure**. Jamais un
> bouton, jamais un bandeau promotionnel.

## Menus à créer

Admin → **Boutique en ligne → Navigation**.

**`main-menu`** : Mon eau (`/pages/mon-eau`) · Le filtre (`/#fonctionnement`) ·
Boutique (`/collections/filtres`) · Questions (`/#faq`)

**`footer`** : Le filtre ONDÉE · Cartouches C90 · Rapport d'eau · Ce qu'ONDÉE ne
fait pas · Livraison & retours · CGV · Mentions légales · Confidentialité · Contact

## Avis clients

La section « Avis clients » est livrée **vide, volontairement**. Publier de faux
avis est une pratique commerciale trompeuse interdite (directive Omnibus
(UE) 2019/2161 ; art. L.121-2 et L.121-4 11° du code de la consommation).
Branchez Judge.me ou Loox, ou saisissez de vrais avis collectés.

Le JSON-LD produit **n'inclut aucun `aggregateRating`** pour la même raison.
