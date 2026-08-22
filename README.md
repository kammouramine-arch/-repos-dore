# RÉVA — Site premium de récupération &amp; bien-être

Site e-commerce vitrine complet en HTML / CSS / JavaScript natif, sans aucune dépendance,
pensé pour être intégré tel quel dans un thème Shopify.

**Positionnement** : marque premium d'appareils de récupération (jambes, pieds, nuque, yeux)
à 149 € – 249 €. Le parcours est construit pour justifier ce prix — preuve technique,
transparence sur la fabrication, essai 30 nuits, garantie 2 ans, service humain.

---

## 1. Contenu livré

| Fichier | Page |
|---|---|
| `index.html` | Accueil (hero plein écran, manifeste, collection, technologie, chiffres, avis, comparatif, presse, CTA) |
| `produit.html` | Page produit haut de gamme — RÉVA Circula (galerie, options, barre d'achat collante, specs, avis, cross-sell) |
| `a-propos.html` | La maison RÉVA (récit, chronologie, engagements, fabrication, showroom) |
| `faq.html` | FAQ — 22 questions, recherche instantanée, 5 catégories filtrables |
| `contact.html` | Contact (4 canaux, formulaire validé, infos pratiques) |
| `assets/css/style.css` | Design system complet (jetons, composants, responsive) |
| `assets/js/main.js` | 19 modules autonomes, sans dépendance |
| `assets/img/*.svg` | Visuels produits vectoriels — **à remplacer par vos photos** |

Prévisualiser : `python3 -m http.server 8000` puis <http://localhost:8000>.

---

## 2. Direction artistique

**Palette** — noir `#0A0A0B`, blanc, gris `#F1F2F4` → `#55585F`, or `#C2A26B`,
bleu nuit `#0E1D33`. L'or n'est jamais un aplat : filets, micro-détails, un seul
bouton doré par page. C'est ce qui sépare le premium du clinquant.

**Typographie** — Inter (200–600) partout, Instrument Serif en italique pour les
accents éditoriaux. Titres en graisse 200/300 avec interlettrage négatif (`-.04em`),
échelle entièrement fluide en `clamp()` : aucune rupture typographique entre 320 et 1440 px.

**Espacement** — sections à `clamp(5.5rem, 12vw, 11rem)`. Le vide est la matière
première du positionnement premium : ne le réduisez pas pour « gagner de la place ».

**Animations** — révélations au scroll (opacité + 26 px), titres ligne par ligne,
manifeste qui s'allume mot à mot, compteurs chiffrés, parallaxe légère (0,03–0,08),
carrousel d'avis, accordéons animés en hauteur. Tout est neutralisé sous
`prefers-reduced-motion`.

Les jetons sont regroupés en variables CSS en tête de `style.css` : rebrander le site
revient à modifier une dizaine de lignes.

---

## 3. JavaScript

Chaque module est indépendant et sans effet si son markup est absent — vous pouvez
supprimer une section entière sans rien casser.

Header au scroll · nav mobile plein écran · panier latéral persistant (`localStorage`) ·
révélations `IntersectionObserver` · manifeste progressif · compteurs · carrousel d'avis
(flèches, points, swipe, autoplay en pause au survol) · accordéons · galerie produit ·
sélecteurs d'options · quantité · barre d'achat collante · barres de notation · parallaxe ·
recherche FAQ insensible aux accents · validation de formulaires · lien de nav actif.

### Robustesse
- Les états masqués des animations sont conditionnés à la classe `js` posée dans le
  `<head>` : **sans JavaScript, tout le contenu reste visible et indexable**.
- Les compteurs contiennent leur valeur finale dans le HTML ; le JS repart de zéro.
- Navigation clavier, attributs `aria-*`, focus visible, lien d'évitement sur chaque page.

---

## 4. Intégration Shopify

### 4.1 Où placer les fichiers

```
theme/
├─ assets/
│  ├─ style.css          ← assets/css/style.css
│  ├─ main.js            ← assets/js/main.js
│  └─ legs.svg, foot.svg, neck.svg, eye.svg, unit.svg, fabric.svg, case.svg
├─ snippets/
│  ├─ announcement.liquid   ← bloc .announce
│  ├─ header.liquid         ← <header> + .mobile-nav
│  ├─ cart-drawer.liquid    ← .overlay + .drawer
│  └─ footer.liquid         ← <footer>
├─ sections/
│  ├─ hero.liquid, trust.liquid, manifesto.liquid, collection.liquid,
│  │  tech-split.liquid, bleed.liquid, stats.liquid, quotes.liquid,
│  │  compare.liquid, press.liquid, cta-band.liquid
│  └─ main-product.liquid   ← .pdp + specs + steps + reviews
└─ templates/
   ├─ index.json, product.json, page.about.json, page.faq.json, page.contact.json
```

Dans `theme.liquid` :

```liquid
{{ 'style.css' | asset_url | stylesheet_tag }}
<script>document.documentElement.className += " js";</script>
...
{% render 'announcement' %}
{% render 'header' %}
{% render 'cart-drawer' %}
{{ content_for_layout }}
{% render 'footer' %}
<script src="{{ 'main.js' | asset_url }}" defer></script>
```

Le HTML est déjà découpé section par section (commentaires `═══`) pour faciliter
ce découpage.

### 4.2 Carte produit dynamique

```liquid
{% for product in collections['appareils'].products %}
  <article class="card" data-reveal="scale" style="--delay:{{ forloop.index0 | times: 60 }}ms">
    <a class="card__link" href="{{ product.url }}"><span>Voir {{ product.title }}</span></a>
    <div class="card__media">
      {% if product.metafields.custom.badge %}
        <span class="card__badge">{{ product.metafields.custom.badge }}</span>
      {% endif %}
      {{ product.featured_image | image_url: width: 900 | image_tag: loading: 'lazy' }}
    </div>
    <div class="card__body">
      <div>
        <h3 class="card__title">{{ product.title }}</h3>
        <p class="card__desc">{{ product.metafields.custom.subtitle }}</p>
      </div>
      <p class="card__price">
        {% if product.compare_at_price > product.price %}<s>{{ product.compare_at_price | money }}</s>{% endif %}
        {{ product.price | money }}
      </p>
    </div>
  </article>
{% endfor %}
```

### 4.3 Ajout au panier

```liquid
{% form 'product', product %}
  <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
  <div class="buy">
    <div class="qty" data-qty>
      <button type="button" data-qty-step="-1" aria-label="Diminuer la quantité">−</button>
      <input type="number" name="quantity" value="1" min="1" max="9" aria-label="Quantité">
      <button type="button" data-qty-step="1" aria-label="Augmenter la quantité">+</button>
    </div>
    <button class="btn btn--block" type="submit" {% unless product.available %}disabled{% endunless %}>
      {% if product.available %}Ajouter au panier — {{ product.price | money }}{% else %}Indisponible{% endif %}
    </button>
  </div>
{% endform %}
```

Les sélecteurs `.swatch` et `.chip` doivent alors piloter `input[name="id"]` à partir de
`product.variants`. Deux options :

1. remplacer le module « Options produit » de `main.js` par la logique de variantes de
   votre thème (`variant_selects` sur Dawn) ;
2. conserver le markup et brancher `Cart.add()` sur l'API Ajax :
   `fetch('/cart/add.js', {method:'POST', ...})` puis `fetch('/cart.js')` pour rafraîchir
   le tiroir. La structure HTML (`.drawer`, `.drawer-line`) et les états (`is-open`)
   restent identiques — seule la source des données change.

Le panier livré ici stocke ses lignes dans `localStorage` : c'est une démonstration
d'interface, à remplacer par l'API Shopify en production.

### 4.4 Formulaires

- Contact → `{% form 'contact' %}` en conservant les classes `.field`, `.input`,
  `.field__error` : la validation JS s'y accroche automatiquement.
- Newsletter → `{% form 'customer' %}` avec
  `<input type="hidden" name="contact[tags]" value="newsletter">`.

### 4.5 Réglages de section recommandés

Pour rendre l'accueil éditable dans l'admin, exposez au minimum : titre, sous-titre,
image, libellé et lien de bouton pour `hero`, `bleed` et `cta-band` ; un bloc répétable
pour `trust`, `stats`, `quotes`, `compare` et `press`.

---

## 5. À faire avant la mise en ligne

1. **Photos** — remplacer les SVG de `assets/img/` par vos visuels, ratio 1:1, produits
   détourés ou photographiés sur fond neutre clair. Le design suppose ce traitement.
2. **Contenu commercial** — les chiffres (38 000 foyers, 4,9/5, 1 204 avis, 92 %), les
   témoignages, les titres de presse et les mentions de fabrication sont des
   **exemples de mise en page**. Ils doivent être remplacés par vos données réelles :
   publier des allégations invérifiables relève de la pratique commerciale trompeuse
   (art. L121-2 du Code de la consommation).
3. **Mentions santé** — les produits sont présentés comme des appareils de bien-être et
   non comme des dispositifs médicaux. Conservez le bloc « Précautions d'usage » de la
   page produit et faites valider vos allégations avant diffusion.
4. **Pages légales** — mentions légales, CGV, confidentialité et cookies sont liées dans
   le footer mais restent à rédiger.
5. **SEO** — `title`, `meta description` et Open Graph sont renseignés par page. Ajoutez
   les données structurées `Product` et `FAQPage` via Liquid.
6. **Polices** — Inter et Instrument Serif sont chargées depuis Google Fonts. Sur Shopify,
   préférez l'auto-hébergement dans `assets/` (meilleur LCP, pas de requête tierce).
   Une pile de repli système est déjà déclarée : le site reste lisible si les polices
   ne se chargent pas.

---

## 6. Compatibilité

Chrome, Edge, Firefox et Safari récents, desktop et mobile.
`backdrop-filter`, `clamp()`, `aspect-ratio` et `IntersectionObserver` dégradent
proprement sur les navigateurs anciens : le contenu reste visible, seules les
animations disparaissent.
Points de rupture : 1180 / 1024 / 900 / 620 px.

---

## 8. LifeOS — application mobile

Le dossier [`lifeos/`](lifeos/) contient une application mobile distincte du site
RÉVA : **LifeOS — Your AI Operating System for Life**, un système d'exploitation
personnel piloté par IA (Expo / React Native / TypeScript, backend Supabase,
assistant exécuté côté serveur).

Les deux projets sont indépendants — le site vitrine reste inchangé.
Installation et documentation : [`lifeos/README.md`](lifeos/README.md).
