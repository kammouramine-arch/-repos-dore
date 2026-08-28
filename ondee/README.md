# ONDÉE — Boutique

> **⚠️ Ce dossier est la prévisualisation statique (HTML/CSS/JS).**
> Le livrable Shopify réel est le thème **`../ondee-shopify/`**, empaqueté dans
> **`../ondee-theme.zip`**. Voir `../ondee-shopify/README.md` pour l'installation.
>
> | Vous cherchez… | Allez dans |
> |---|---|
> | Le thème Shopify à installer | `../ondee-theme.zip` |
> | La recherche, les coûts, le fournisseur, le verdict | `DOSSIER.md` |
> | Les publicités et le contenu organique | `PUBLICITE.md` |
> | Le plan de lancement pas à pas | `LANCEMENT.md` |
> | Le contenu des pages (CGV, légal…) | `../ondee-pages/` |
> | L'import produits Shopify | `../ondee-import/` |

Site e-commerce complet en HTML / CSS / JavaScript natif, **sans aucune
dépendance**, conçu pour être intégré tel quel dans un thème Shopify.

**Produit :** pommeau de douche filtrant (réduction du chlore), cartouche
90 jours, deux bandelettes de test au chlore incluses. 59 € l'unité, 89 € le
pack de référence.

**Positionnement :** « On ne promet pas. On prouve. »

📄 Stratégie, scoring, fournisseurs et économie unitaire → **`DOSSIER.md`**
📄 Publicités et contenu organique → **`PUBLICITE.md`**

---

## 1. Ce qui est livré

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil — 16 sections, du bandeau d'annonce au pied de page |
| `produit.html` | Fiche produit — galerie, packs, variantes, barre d'achat collante |
| `assets/css/ondee.css` | Système de design complet (jetons, composants, responsive) |
| `assets/js/ondee.js` | 14 modules autonomes, dont le rapport d'eau Hub'Eau |
| `assets/img/*.svg` | Visuels vectoriels de substitution — **à remplacer par vos photos** |

**Prévisualiser :** `python3 -m http.server 8000` puis <http://localhost:8000>.

---

## 2. Le rapport d'eau — la pièce maîtresse

C'est l'élément qu'aucun concurrent français n'a, et il est **déjà
fonctionnel**. Il interroge en direct, depuis le navigateur, deux API publiques
françaises. **Aucune clé, aucun compte, aucun serveur, aucun coût.**

| API | Rôle | CORS |
|---|---|---|
| `geo.api.gouv.fr` | Autocomplétion commune / code postal → code INSEE | ✅ ouvert |
| `hubeau.eaufrance.fr` | Relevés SISE-Eaux du ministère de la Santé | ✅ `Access-Control-Allow-Origin: *` |

**Paramètres remontés :** `TH` (dureté), `CL2LIB` (chlore libre), `CL2TOT`
(chlore total), `THM4` (trihalométhanes), plus la conclusion de conformité, la
date du prélèvement et le nom du distributeur.

**Testé sur données réelles** (26 août 2026) :

| Commune | Dureté | Chlore libre | Sortie de l'outil |
|---|---|---|---|
| Lille (59350) | **37,6 °f** — très dure | 0,20 mg/L | « ONDÉE retire le chlore » **+** « ONDÉE ne retire pas les 37,6 °f » |
| Toulouse (31555) | **9,4 °f** — douce | 0,24 mg/L | « Le calcaire n'est pas votre sujet » |

L'outil affiche systématiquement **ce que le produit ne fait pas**, et
déconseille l'achat quand le chlore relevé est inférieur à 0,05 mg/L. Ce n'est
pas un détail cosmétique : c'est le cœur du positionnement de la marque.

> **Attribution.** Conservez la mention de la source. Les données sont publiques,
> mais les afficher sans citer SISE-Eaux / Hub'Eau ruinerait la crédibilité qui
> justifie l'outil.

---

## 3. Direction artistique

**Palette** — craie `#F6F4EF`, encre `#0D1416`, pétrole `#0E3A45`, eau
`#9FC7D2`, réactif `#D89B22`.

> **La règle à ne jamais enfreindre :** l'ambre `#D89B22` est la couleur de la
> bandelette de test. Elle ne sert **qu'à afficher une mesure**. Jamais un
> bouton, jamais un bandeau promotionnel.

**Typographie** — Instrument Sans pour le texte, **IBM Plex Mono pour toutes
les valeurs chiffrées, unités et dates**. Le monospace signale « ceci est une
mesure, pas un argument ». C'est la décision typographique centrale de la marque.

**Espacement** — sections en `clamp(3.75rem, 9vw, 7.5rem)`. Le vide fait le
sérieux : ne le réduisez pas pour « gagner de la place ».

Tous les jetons sont en variables CSS en tête de `ondee.css` : rebrander le site
revient à modifier une douzaine de lignes.

---

## 4. Les modules JavaScript

Chaque module est indépendant et sans effet si son markup est absent — vous
pouvez supprimer une section entière sans rien casser.

Header collé · nav mobile plein écran · révélations `IntersectionObserver` ·
accordéons animés en hauteur · **rapport d'eau Hub'Eau** · panier latéral
persistant (`localStorage`) · galerie produit · sélecteurs de variantes ·
sélecteur de packs avec recalcul du prix, du prix barré et du pourcentage ·
quantité · barre d'achat collante mobile · notifications · année du copyright.

Tout est neutralisé sous `prefers-reduced-motion`.

---

## 5. Vérifications déjà effectuées

Testé sous Chromium (Playwright), en 390×844 et 1440×900 :

- ✅ Aucune erreur JavaScript, aucune ressource manquante
- ✅ **Aucun débordement horizontal** sur les deux pages en 390 px
- ✅ Rapport d'eau : autocomplétion, appel API, agrégation, rendu, verdict
- ✅ Packs : prix, prix barré et pourcentage recalculés à chaque sélection
- ✅ Panier : ajout, quantité, variante, total, persistance
- ✅ Barre d'achat collante, accordéons, galerie
- ✅ Structure HTML validée (imbrication des balises)

---

## 6. Intégration Shopify — pas à pas

### 6.1 Préparer la boutique

1. **Créez une boutique distincte** pour ONDÉE. Ne la greffez pas sur
   `maisonreva.fr` : deux marques, deux positionnements, deux pixels.
2. Réglages → Général : pays **France**, devise **EUR**, unités métriques.
3. Réglages → **Taxes** : « Tous les prix incluent la taxe » ✅ — obligatoire en
   B2C France. TVA 20 %.
4. Réglages → **Paiements** : Shopify Payments + PayPal + Apple Pay + Google Pay.
5. Réglages → **Expédition** : profil France — Mondial Relay et Colissimo,
   **gratuit au-dessus de 49 €**, 4,90 € en dessous. Profil BE/LU/CH à 7,90 €.
6. Réglages → **Politiques** : rédigez CGV, mentions légales, politique de
   confidentialité, retours. Shopify fournit des modèles — **relisez-les**, ils
   sont anglo-saxons par défaut et ne mentionnent ni la garantie légale de
   conformité, ni le droit de rétractation de 14 jours.

### 6.2 Créer les produits

Créez le produit principal avec ces variantes :

| Titre | Prix | SKU | Poids |
|---|---:|---|---:|
| ONDÉE — Le pommeau | 59,00 € | `ONDEE-SOLO` | 400 g |
| ONDÉE — Six mois | 74,00 € | `ONDEE-ESSENTIEL` | 480 g |
| ONDÉE — L'année complète | 89,00 € | `ONDEE-AN` | 640 g |
| ONDÉE — Le duo | 149,00 € | `ONDEE-DUO` | 1 040 g |

Second produit, les cartouches :

| Titre | Prix | SKU |
|---|---:|---|
| Cartouche C90 — à l'unité | 19,00 € | `C90-1` |
| Cartouche C90 — lot de 2 | 34,00 € | `C90-2` |
| Cartouche C90 — lot de 4 | 59,00 € | `C90-4` |
| Cartouche C90 — abonnement | 15,00 € | `C90-ABO` |

**Prix barrés (« comparer à ») :** uniquement sur les packs, où le prix barré
est la somme réelle des articles vendus séparément. **Aucun prix barré sur
`ONDEE-SOLO`** — il n'a jamais été vendu plus cher.

### 6.3 Porter le design dans le thème

**Option A — la plus rapide (recommandée pour lancer)**

Prenez le thème **Dawn**, puis dans *Personnaliser → Paramètres du thème* :

- Couleurs : fond `#F6F4EF`, texte `#0D1416`, boutons `#0E3A45`, accent
  `#9FC7D2`.
- Typographie : Instrument Sans (titres et texte). Shopify ne propose pas IBM
  Plex Mono nativement — ajoutez-le via `<link>` dans `theme.liquid` et
  appliquez-le aux prix avec un peu de CSS personnalisé.
- Rayon des angles : 4 px. Ombres : aucune.

Puis recréez chaque section de `index.html` avec les sections natives de Dawn,
en collant le texte tel quel. **Toute la copie est écrite, il n'y a rien à
inventer.**

**Option B — reprise fidèle du design**

1. Admin → *Boutique en ligne → Thèmes → ⋯ → Modifier le code*.
2. `Assets → Ajouter un fichier` : téléversez `ondee.css` et `ondee.js`.
3. Dans `layout/theme.liquid`, avant `</head>` :
   ```liquid
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
   {{ 'ondee.css' | asset_url | stylesheet_tag }}
   ```
   et avant `</body>` :
   ```liquid
   {{ 'ondee.js' | asset_url | script_tag }}
   ```
4. Remplacez les chemins d'images `assets/img/x.svg` par
   `{{ 'x.svg' | asset_url }}`.
5. Découpez `index.html` en sections Liquid dans `sections/`, une section par
   bloc `<!-- ══ … ══ -->`.

### 6.4 Brancher le panier sur Shopify

Le panier de démonstration utilise `localStorage`. Pour le connecter :

- Dans `ondee.js`, remplacez le contenu de `Panier.ajouter()` par un `POST` sur
  `/cart/add.js` avec l'`id` de variante Shopify.
- Ajoutez `data-variant-id="{{ variant.id }}"` sur chaque bouton `.pack`.
- Remplacez le gestionnaire `[data-checkout]` par une redirection vers
  `/checkout`.

```js
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: variantId, quantity: qte })
}).then(function () { window.location = '/cart'; });
```

### 6.5 Le rapport d'eau dans Shopify

Le module fonctionne tel quel : il n'a besoin d'aucun serveur.

1. Créez une page `/pages/mon-eau` avec un modèle dédié.
2. Collez le markup de la section `<section class="rapport">` de `index.html`.
3. `ondee.js` étant chargé globalement, le module s'accroche automatiquement
   dès qu'il trouve `#commune`.

> **Faites-en aussi une page à part entière** en plus de la section d'accueil :
> c'est votre meilleure page d'atterrissage pour les publicités de haut de
> tunnel (concepts 2 et 10) et un excellent aimant à référencement naturel sur
> les requêtes « dureté eau + nom de commune ».

### 6.6 Applications à installer

| Besoin | Application | Coût indicatif |
|---|---|---|
| Avis clients **vérifiés** | Judge.me ou Loox | 15-30 €/mois |
| Abonnement cartouches | Recharge, Seal Subscriptions ou Appstle | 0-40 €/mois |
| Upsell après achat | AfterSell ou ReConvert | 20-30 €/mois |
| Points relais | Mondial Relay officiel | gratuit-10 €/mois |
| Bannière cookies RGPD | Consentmo ou Pandectes | gratuit-10 €/mois |

**Ne pas installer :** aucune application de faux compte à rebours, de faux
compteur de visiteurs ou de fausses ventes en direct. Elles sont visées par la
directive Omnibus (UE) 2019/2161 et détruiraient le seul actif de cette marque.

### 6.7 À faire impérativement avant d'ouvrir

- [ ] **Remplacer tous les avis d'exemple.** Ils sont balisés par des
      commentaires `⚠` dans `index.html` et `produit.html`. Publier de faux
      avis est une pratique commerciale trompeuse (art. L.121-2 et L.121-4 11°
      du code de la consommation).
- [ ] **Retirer `aggregateRating`** du JSON-LD de `produit.html` tant que vous
      n'avez pas de vrais avis.
- [ ] **Faire confirmer les performances de filtration par le fournisseur.**
      Aucun pourcentage de réduction du chlore ne doit être publié sans rapport
      d'essai. Les caractéristiques techniques portent déjà cette réserve.
- [ ] **Demander les certificats de conformité matériaux** (ACS, ou équivalent
      européen, ou a minima NSF/ANSI 177 + fiches matières). Voir le risque n° 1
      du `DOSSIER.md`.
- [ ] Adhérer à **Citeo ou Léko** et obtenir votre **Identifiant Unique ADEME**.
- [ ] Compléter le SIREN dans les deux pieds de page.
- [ ] Vérifier l'antériorité **INPI et EUIPO** du nom ONDÉE en classes 11 et 21.
- [ ] Remplacer `bonjour@ondee.fr` par une adresse réellement relevée.
- [ ] Vérifier les affirmations de livraison (« Roubaix », « 48 h ») ou les
      adapter à votre réalité.

---

## 7. Ce qu'il faut photographier et filmer

Les SVG livrés sont des substituts. Voici la liste de prise de vue complète.
**Tout se tourne au téléphone, en lumière naturelle, sur fond craie.**

### Photos produit — indispensables

| # | Sujet | Cadrage | Usage |
|---|---|---|---|
| 1 | Pommeau seul, trois quarts | Fond craie, ombre douce à droite | Visuel principal, publicités |
| 2 | Pommeau vissé sur un flexible | En situation, salle de bain réelle | Galerie 2 |
| 3 | **Fenêtre de la cartouche, macro** | Le média filtrant visible | Différenciateur |
| 4 | Cartouche sortie de son logement | Main tenant les deux pièces | Explique le remplacement |
| 5 | Cartouche en coupe | Les cinq étages visibles | Preuve technique |
| 6 | Les trois finitions alignées | Craie, noir, chrome | Sélecteur de variantes |
| 7 | Contenu de la boîte à plat | Pommeau, cartouche, 2 bandelettes, joint, notice | Justifie le prix |
| 8 | **Les deux bandelettes côte à côte** | Ambre / blanche, sur fond blanc | **Le visuel signature** |
| 9 | Boîte fermée, champs TH/Cl₂ vierges | Trois quarts, kraft | Marque |
| 10 | Dos de la notice, « ce qu'ONDÉE ne fait pas » | Macro lisible | Preuve d'honnêteté |
| 11 | Cartouche neuve vs cartouche à 90 jours | Même cadre, même lumière | Rachat |
| 12 | Le pommeau en main, échelle | Montre la taille réelle | Réduit les retours |

### Vidéos — indispensables

| # | Sujet | Durée | Usage |
|---|---|---|---|
| V1 | **Test à la bandelette avant/après, plan-séquence** | 18 s | Publicité n° 1 |
| V2 | Installation en temps réel, non coupée | 60 s | Objection « c'est compliqué » |
| V3 | Jet en fonctionnement, macro à 240 i/s | 8 s | Rassure sur la pression |
| V4 | Remplacement de cartouche | 10 s | Fiche produit |
| V5 | Cartouche sciée, média versé | 12 s | Organique + reciblage |
| V6 | Enregistrement d'écran du rapport d'eau | 25 s | Publicité haut de tunnel |
| V7 | Test au seau chronométré, avec et sans filtre | 20 s | Preuve de débit |
| V8 | Déballage, sans voix off | 15 s | Preuve sociale |

### À ne surtout pas produire

❌ Avant/après de cheveux · ❌ Femme qui rit sous la douche en banque d'images ·
❌ Animation 3D de molécules · ❌ Gros plan de peau « avant / après » ·
❌ Tout visuel suggérant que le calcaire disparaît.

**Le seul avant/après de cette marque est celui d'une bandelette de test.**

---

## 8. Accessibilité et performance

Contrastes conformes AA · navigation clavier complète · `aria-expanded`,
`aria-pressed`, `role="status"` sur les zones dynamiques · lien d'évitement ·
`prefers-reduced-motion` respecté partout · images dimensionnées (`width` /
`height`) pour éviter les décalages de mise en page · `fetchpriority="high"`
sur le visuel du héros, `loading="lazy"` sur le reste.

**Zéro dépendance JavaScript.** Le seul chargement externe est Google Fonts —
supprimez-le et auto-hébergez les polices si vous voulez gratter les derniers
points de LCP.
