# RÉVA — thème Shopify Online Store 2.0

Thème premium pour marques d'appareils de récupération et de bien-être, converti
depuis la maquette HTML/CSS/JS d'origine. **Le design n'a pas été refait** : le
design system, les composants et les animations sont conservés à l'identique ;
seul le rendu passe par Liquid, et tout le contenu devient modifiable dans
l'éditeur de thème Shopify.

Aucune dépendance : ni framework, ni jQuery, ni CDN tiers.

---

## 1. Installation

### En ZIP (le plus simple)

```bash
zip -r reva-theme.zip . -x '.git/*' '.github/*' '*.DS_Store'
```

Puis, dans l'admin Shopify : **Boutique en ligne → Thèmes → Ajouter un thème →
Importer un fichier ZIP**. Le thème s'installe tel quel, sans étape technique.

### En ligne de commande (développement)

```bash
npm i -g @shopify/cli
shopify theme dev --store votre-boutique.myshopify.com   # aperçu à chaud
shopify theme check                                       # 0 erreur, 0 avertissement
shopify theme push                                        # publication
```

---

## 2. Arborescence

```
layout/     theme.liquid · password.liquid
templates/  index · product · collection · list-collections · page
            page.about · page.faq · page.contact · blog · article
            search · cart · 404 · password · gift_card · customers/*
sections/   28 sections, toutes avec un {% schema %} traduit
snippets/   icon · card-product · cart-drawer · stars · product-rating
            swatch-color · meta-tags · structured-data · fonts
assets/     style.css · main.js · 6 fichiers woff2 · visuels SVG
config/     settings_schema.json · settings_data.json
locales/    fr.default.json · en.json (+ .schema.json pour l'éditeur)
```

Les en-têtes et pieds de page utilisent les **groupes de sections** OS 2.0
(`sections/header-group.json`, `sections/footer-group.json`) : ils sont donc
réorganisables depuis l'éditeur, sur toutes les pages à la fois.

---

## 3. Sections disponibles

| Section | Blocs | Utilisée par |
|---|---|---|
| Bandeau d'annonce | messages défilants | groupe en-tête |
| En-tête | — | groupe en-tête |
| Pied de page | colonnes de liens | groupe pied de page |
| Bannière d'accueil | chiffres clés | accueil |
| Bandeau de réassurance | garanties | accueil |
| Manifeste | — | accueil |
| Collection en vedette | — | accueil |
| Image et texte | points numérotés, paragraphes, citations | accueil, produit, maison |
| Déclaration pleine page | — | accueil, maison |
| Chiffres clés | chiffres animés | accueil, maison |
| Avis clients (carrousel) | témoignages | accueil |
| Tableau comparatif | lignes | accueil |
| Bandeau presse | titres de presse | accueil |
| Bandeau d'action | — | toutes |
| Page produit | garanties, description, accordéons | produit |
| Caractéristiques | caractéristiques | produit, contact |
| Étapes | étapes | produit |
| Contenu de la boîte | éléments | produit |
| Avis produit | avis | produit |
| Produits associés | — | produit |
| Bannière de page | — | pages éditoriales |
| Chronologie | repères | maison |
| Engagements | engagements | maison |
| Encart showroom | — | maison |
| FAQ | catégories, questions | FAQ |
| Contact | canaux de contact | contact |
| Pages système | panier, collection, recherche, journal, article, 404, page protégée | — |

Chaque section expose ses textes, images, liens, ancres et options de mise en
page. Rien n'est codé en dur : les libellés par défaut reprennent simplement le
contenu de la maquette.

---

## 4. Réglages du thème

* **Identité** — logo, favicon, image de partage social.
* **Couleurs** — cinq jetons (noir, or, or clair, bleu nuit, fond) injectés en
  variables CSS : rebrander le thème tient en cinq champs.
* **Typographie** — Inter et Instrument Serif **auto-hébergées** sur le CDN
  Shopify (aucune requête vers Google Fonts). Décochable pour tomber sur la pile
  système.
* **Coordonnées** — e-mail et téléphone, repris dans le menu mobile et les
  données structurées.
* **Réseaux sociaux** — cinq liens, icônes affichées seulement si renseignées.
* **Panier** — tiroir latéral en Ajax, ou redirection classique vers `/cart`.
* **Animations** — interrupteur global ; toujours neutralisées si le visiteur a
  activé « réduire les animations » au niveau du système.

---

## 5. Fonctionnement e-commerce

* **Panier** — API Ajax Shopify (`/cart.js`, `/cart/add.js`, `/cart/change.js`).
  Le tiroir est rendu en Liquid au chargement (indexable, sans saut de mise en
  page) puis rafraîchi en JavaScript.
* **Variantes** — les options produit deviennent des pastilles de couleur ou des
  puces. Prix, prix barré, économie, disponibilité, image et paramètre `?variant=`
  se mettent à jour sans rechargement. Les couleurs des pastilles se règlent dans
  l'éditeur (« Onyx: #17191D », une par ligne) ; une table de correspondance
  fr/en couvre les noms courants.
* **Formulaires** — `{% form 'contact' %}`, `{% form 'customer' %}` (newsletter),
  commentaires d'article et pages client. La validation JavaScript se contente de
  bloquer l'envoi si un champ est invalide : la soumission reste native.
* **Comptes clients** — connexion, inscription, mot de passe oublié, activation,
  commandes et adresses.

### Métachamps reconnus

| Métachamp | Effet |
|---|---|
| `custom.badge` | pastille « Best-seller », « Nouveau »… sur la carte et la galerie |
| `custom.subtitle` | sous-titre de la carte produit |
| `custom.tagline` | accroche sous le titre de la page produit |
| `reviews.rating` / `reviews.rating_count` | remplacent automatiquement la note et le nombre d'avis saisis dans l'éditeur |

---

## 6. Performances & SEO

* CSS unique préchargée, JavaScript unique différé (~20 Ko), zéro dépendance.
* Polices auto-hébergées, sous-ensembles latin / latin étendu, `font-display: swap`,
  préchargement des deux fichiers critiques.
* Images servies par `image_url` avec `srcset`, `sizes`, `width`/`height` et
  `loading="lazy"` (sauf la première image produit, en `fetchpriority="high"`).
* Balises `title`, `meta description`, canonique, Open Graph et Twitter Card.
* Données structurées JSON-LD : `Organization`, `Product` (avec offres et note
  agrégée), `BreadcrumbList`, `FAQPage`, `BlogPosting`.
* Sans JavaScript, tout le contenu reste visible et indexable : les états masqués
  sont conditionnés à la classe `js` posée dans le `<head>`.
* `shopify theme check` : **76 fichiers inspectés, aucune anomalie**.

---

## 7. À faire avant la mise en ligne

1. **Produits** — créer les produits et la collection mise en avant, puis la
   sélectionner dans la section « Collection en vedette ».
2. **Menus** — créer `main-menu` et `footer` dans *Navigation*, puis les affecter
   à l'en-tête et aux trois colonnes du pied de page.
3. **Pages** — créer les pages *Maison*, *FAQ* et *Contact*, et leur appliquer les
   modèles `page.about`, `page.faq` et `page.contact`.
4. **Visuels** — remplacer les SVG de démonstration par vos photos (ratio 1:1,
   produits détourés ou fond neutre clair).
5. **Contenu commercial** — les chiffres, témoignages et titres de presse fournis
   sont des **exemples de mise en page**. Ils doivent être remplacés par vos
   données réelles : publier des allégations invérifiables relève de la pratique
   commerciale trompeuse (art. L121-2 du Code de la consommation).
6. **Mentions santé** — les produits sont présentés comme des appareils de
   bien-être et non comme des dispositifs médicaux. Conservez le bloc
   « Précautions d'usage » et faites valider vos allégations.
7. **Pages légales** — mentions légales, CGV, confidentialité et cookies, à lier
   via le menu du pied de page.

---

## 8. Compatibilité

Chrome, Edge, Firefox et Safari récents, desktop et mobile.
`backdrop-filter`, `clamp()`, `aspect-ratio` et `IntersectionObserver` dégradent
proprement : le contenu reste visible, seules les animations disparaissent.
Points de rupture : 1180 / 1024 / 900 / 620 px.
