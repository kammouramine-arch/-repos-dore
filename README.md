# RÉVA — Thème Shopify Online Store 2.0

Thème premium pour **RÉVA**, marque française de technologie de récupération
(appareils vendus 149 € – 249 €). Architecture Shopify native, sans framework,
sans dépendance externe.

Direction artistique : minimalisme absolu, noir profond, blanc cassé, gris clair,
doré très discret, beaucoup d'espace, micro-animations. Aucune reprise visuelle
d'une marque existante.

---

## 1. Installation

```bash
zip -r reva-theme.zip layout templates sections snippets assets config locales
```

Puis dans l'administration Shopify : **Boutique en ligne → Thèmes → Ajouter un thème
→ Importer un fichier ZIP**.

Le ZIP doit contenir les sept dossiers **à la racine** (pas dans un dossier parent),
ce que produit la commande ci-dessus.

Développement en local avec Shopify CLI :

```bash
shopify theme dev --store votre-boutique.myshopify.com
shopify theme check     # analyse statique
shopify theme push
```

---

## 2. Architecture

```
layout/          theme.liquid · password.liquid
templates/       13 gabarits JSON + 7 gabarits client Liquid
sections/        26 sections + 2 groupes de sections
snippets/        11 partiels réutilisables
assets/          theme.css · theme.js · product.js · 7 illustrations SVG
config/          settings_schema.json · settings_data.json
locales/         fr.default.json · en.json
```

### Gabarits

| Fichier | Rôle |
|---|---|
| `index.json` | Accueil — 16 sections |
| `product.json` | Fiche produit + comparatif + avis + FAQ + recommandations |
| `collection.json` | Grille de collection avec tri et pagination |
| `list-collections.json` | Index des collections |
| `page.json` | Page libre |
| `page.about.json` | À propos (récit, chronologie, engagements, fabrication) |
| `page.contact.json` | Contact (4 canaux + formulaire) |
| `page.faq.json` | FAQ filtrable, 12 questions |
| `page.legal.json` | Livraison, Garantie, Retours, CGV, Confidentialité, Mentions légales |
| `cart.json` · `search.json` · `blog.json` · `article.json` · `404.json` · `password.json` | Gabarits standards |
| `customers/*.liquid` | Connexion, inscription, compte, commande, adresses, activation, réinitialisation |

Les six pages informatives partagent `page.legal.json` : créez la page dans
**Boutique en ligne → Pages**, puis affectez-lui le gabarit `page.legal`.
Le contenu se rédige dans l'éditeur de page, pas dans le code.

### Sections

**Accueil** — `hero` (vidéo ou image plein écran) · `trust-bar` · `manifesto` ·
`featured-collection` · `feature-split` · `before-after` · `statement-banner` ·
`stats` · `rich-text` · `testimonials` · `comparison-table` · `faq` ·
`logo-list` · `cta-band` · `newsletter`

**Structure** — `header` · `announcement-bar` · `footer` · `cart-drawer`
(+ `header-group.json` et `footer-group.json`)

**Gabarits** — `main-product` · `main-collection` · `main-cart` · `main-page` ·
`main-search` · `main-blog` · `main-article` · `main-list-collections` ·
`main-404` · `main-password` · `product-recommendations` · `contact-form` ·
`timeline` · `value-props`

Chaque section possède son `{% schema %}` complet : réglages, blocs, `presets`
pour l'ajout depuis l'éditeur, et `enabled_on` pour les groupes. **Tout est
modifiable sans toucher au code** : textes, couleurs, images, vidéo, ordre des
blocs, marges, nombre de colonnes.

---

## 3. Page d'accueil

Dans l'ordre : ouverture plein écran (vidéo premium, titre en trois lignes
révélées, deux boutons, trois chiffres de réassurance) → bandeau de garanties →
manifeste dont les mots s'allument au défilement → collection → technologie →
comparateur avant/après à curseur → bandeau plein écran → chiffres animés →
rituel du soir → philosophie → avis clients → tableau comparatif → FAQ →
titres de presse → appel à l'action → lettre d'information.

## 4. Page produit

Galerie avec vignettes, navigation clavier et **zoom plein écran** · sélecteur de
variantes accessible (boutons radio, pastilles de couleur si la boutique fournit
des échantillons) · prix et disponibilité mis à jour sans rechargement ·
**paiement fractionné** (`payment_terms`) et boutons de paiement accéléré ·
**barre d'achat collante** · quatre garanties · accordéons livraison / garantie /
précautions · tableau comparatif · avis · FAQ · recommandations chargées via la
Section Rendering API.

---

## 5. Réglages du thème

`config/settings_schema.json` expose huit groupes : **Couleurs** (neutres et
accents), **Typographie** (deux polices, échelle, interlettrage, graisse des
titres), **Mise en page** (largeur, respiration entre sections, arrondis),
**Animations**, **Fiche produit**, **Panier** (tiroir ou page, seuil de livraison
offerte), **Réseaux sociaux**, **Partage** et **Favicon**.

Ces réglages alimentent les variables CSS via `snippets/css-variables.liquid`,
rendu **après** la feuille de style pour que les choix du marchand priment sur
les valeurs par défaut. Rebrander le thème ne demande aucune ligne de code.

---

## 6. Technique

**Panier** — API Ajax Shopify avec *bundled section rendering* : `cart/add.js` et
`cart/change.js` renvoient le tiroir déjà rendu, remplacé sans rechargement.
Barre de progression vers la livraison offerte, instructions de commande,
remises panier.

**JavaScript** — éléments personnalisés natifs (`sticky-header`, `quantity-input`,
`variant-picker`, `quote-carousel`, `compare-slider`, `sticky-buy-bar`,
`product-recommendations`). `product.js` n'est chargé que sur les pages produit
et collection. Aucune bibliothèque tierce.

**Performance** — un seul CSS et un seul JS, chargés en `defer` ; images en
`image_tag` avec `widths`, `sizes` et `loading="lazy"` (`eager` + `fetchpriority`
sur le visuel d'ouverture) ; SVG vectoriels légers ; aucune requête bloquante.

**Accessibilité** — lien d'évitement, piège de focus sur le tiroir et le menu,
`aria-*` complets, navigation clavier de la galerie, focus visible, contrastes
conformes.

**SEO** — `title` et `meta description` par gabarit, Open Graph et Twitter Card,
données structurées `Product` et `Article` via `structured_data`, URL canonique,
hiérarchie de titres cohérente.

**Animations** — révélations par `IntersectionObserver`, parallaxe discrète,
compteurs, transitions fluides. L'ensemble est neutralisé sous
`prefers-reduced-motion` et désactivable depuis les réglages du thème.

---

## 7. Éditeur de thème

Le thème réagit aux événements `shopify:section:load`, `shopify:section:select`
et `shopify:section:deselect` : les sections rechargées rejouent leurs
animations et le tiroir panier s'ouvre quand on le sélectionne dans l'éditeur.

---

## 8. Avant la mise en ligne

1. **Visuels** — les SVG de `assets/` (`device-*.svg`) sont des illustrations de
   secours. Chargez vos photographies : ratio 1:1 pour les cartes et la galerie,
   produits détourés ou sur fond neutre clair. Pour l'ouverture, une vidéo muette
   de 8 à 12 s avec image d'attente.
2. **Menus** — créez `main-menu` et `footer` dans **Navigation** ; le thème s'y
   réfère par défaut.
3. **Contenu commercial** — les chiffres (38 000 clients, 4,9/5, 2 418 avis,
   92 %, −31 %), les témoignages et les titres de presse sont des **exemples de
   mise en page**. Remplacez-les par vos données réelles : publier des allégations
   invérifiables relève de la pratique commerciale trompeuse (art. L121-2 du Code
   de la consommation).
4. **Mentions santé** — les produits sont présentés comme des appareils de
   bien-être et non comme des dispositifs médicaux. Conservez le bloc
   « Précautions d'usage » de la fiche produit et faites valider vos allégations.
5. **Pages légales** — CGV, confidentialité, mentions légales, livraison,
   garantie et retours doivent être rédigées ; le gabarit et la navigation sont
   prêts.
6. **Métachamps** — `custom.subtitle` (accroche produit) et `custom.badge`
   (pastille) sont exploités par les cartes et la fiche produit. La note en
   étoiles lit `reviews.rating` et `reviews.rating_count`, renseignés par la
   plupart des applications d'avis.

---

## 9. Compatibilité

Online Store 2.0 · Chrome, Edge, Firefox et Safari récents, desktop et mobile.
Points de rupture : 1180 / 1024 / 900 / 620 px. Dégradation propre sans
JavaScript : tout le contenu reste visible et indexable, seules les animations
disparaissent.
