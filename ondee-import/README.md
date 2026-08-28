# Paramétrage automatique du store ONDÉE

`setup-ondee.mjs` crée **tout ce qui est créable par API** dans votre store
Shopify ONDÉE : produits, variantes, prix barrés, poids, collections, pages,
navigation, publication et stock initial.

**Aucune dépendance.** Node 18 ou plus. Toutes les opérations GraphQL ont été
validées contre le schéma Admin de Shopify, et le script a été testé de bout en
bout contre un serveur simulant l'API.

---

## 1. Obtenir un jeton d'accès

Admin Shopify → **Paramètres → Applications et canaux de vente → Développer des
applications → Créer une application** → nommez-la « ONDÉE Setup ».

Onglet **Configuration → Champs d'application de l'API Admin**, cochez :

```
write_products                    read_products
write_publications
write_content                     read_content
write_online_store_pages          read_online_store_pages
write_online_store_navigation     read_online_store_navigation
write_inventory                   read_inventory
read_locations
```

**Installer l'application** → copiez le **jeton d'accès Admin API** (`shpat_…`).
Il ne s'affiche qu'une fois.

## 2. Lancer

```bash
cd ondee-import

# Répétition générale : n'écrit rien, affiche ce qui serait fait
SHOP=votre-boutique.myshopify.com TOKEN=shpat_xxx node setup-ondee.mjs --dry-run

# Pour de vrai
SHOP=votre-boutique.myshopify.com TOKEN=shpat_xxx node setup-ondee.mjs

# Avec un stock initial de 100 unités par variante
SHOP=… TOKEN=… STOCK=100 node setup-ondee.mjs
```

---

## Ce que fait le script

| Étape | Détail |
|---|---|
| **Garde-fou** | Lit le nom et le domaine du store. **S'arrête avec le code 2** si cela ressemble à RÉVA. Testé. |
| **Produits** | 3 produits, 9 variantes, avec SKU, poids, suivi de stock, SEO et prix barrés |
| **Collections** | Filtres de douche · Cartouches & recharges · Tout ONDÉE |
| **Pages** | Les 8 pages de `../ondee-pages/` |
| **Navigation** | `main-menu` (4 entrées) et `footer` (10 entrées), reliés aux vraies pages et collections |
| **Publication** | Tout est publié sur la boutique en ligne |
| **Stock** | Optionnel, via `STOCK=` |

### Deux comportements à connaître

**Il est idempotent.** Relancé, il met à jour au lieu de dupliquer — la
recherche se fait par *handle*. Testé sur deux exécutions successives.

**Il refuse de publier une page légale incomplète.** Toute page contenant encore
un marqueur `[[…]]` est créée **en brouillon**, et le script vous le signale.
Complétez `../ondee-pages/`, relancez, elles passeront en ligne.

---

## Ce que le script ne peut pas faire

Ces actions n'existent pas dans l'API Admin ou exigent une validation humaine :

| À faire à la main | Où |
|---|---|
| **Importer le thème** `../ondee-theme.zip` | Boutique en ligne → Thèmes → Importer |
| **Assigner le produit à la section « L'offre »** | Éditeur de thème → Accueil → L'offre |
| **Taxes** — cocher « tous les prix incluent la taxe » | Paramètres → Taxes et droits |
| **Expédition** — port offert dès 49 €, 4,90 € en dessous | Paramètres → Expédition |
| **Paiements** — activer Shopify Payments | Paramètres → Paiements |
| **Politiques de la boutique** | Paramètres → Politiques |
| **Domaine** | Paramètres → Domaines |
| **Applications** — avis, abonnement, upsell, cookies | Boutique d'applications |

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `setup-ondee.mjs` | Le script |
| `produits-shopify.json` | Source de vérité des produits (lue par le script) |
| `produits-ondee.csv` | Même contenu au format d'import CSV Shopify, si vous préférez l'interface |
| `collections.json` | Définition des collections, pour référence |
