# ONDÉE — Plan de lancement

Ce document est la liste d'exécution. Tout ce qui est ✅ est fait et livré dans
ce dépôt. Tout ce qui est ⏳ nécessite votre intervention — parce qu'il faut un
compte, un paiement, une signature ou une décision d'entreprise.

---

## ✅ Ce qui est terminé

| | Livrable | Où |
|---|---|---|
| ✅ | Recherche produit, 12 candidats notés, gagnant à 84,6/100 | `DOSSIER.md` parties 1-3 |
| ✅ | Preuves de marché, concurrents, prix relevés à la source | `DOSSIER.md` partie 3 |
| ✅ | Fournisseur vérifié, lien direct, prix, MOQ, certifications | `DOSSIER.md` partie 4 |
| ✅ | Coût rendu France, droits, TVA, marges, 3 scénarios | `DOSSIER.md` partie 5 |
| ✅ | Marque, positionnement, avatar, palette, packaging | `DOSSIER.md` partie 6 |
| ✅ | Offre, packs, abonnement, garantie, urgence honnête | `DOSSIER.md` partie 7 |
| ✅ | **Thème Shopify complet — 83 fichiers, 0 erreur theme-check** | `ondee-shopify/` + `ondee-theme.zip` |
| ✅ | Toute la copie du site, en français | dans le thème |
| ✅ | 8 pages de contenu, dont CGV, mentions légales, RGPD | `ondee-pages/` |
| ✅ | **Script de paramétrage Shopify automatique**, testé de bout en bout | `ondee-import/setup-ondee.mjs` |
| ✅ | CSV d'import produits + définition des collections | `ondee-import/` |
| ✅ | Barre de progression vers le port offert dans le panier | dans le thème |
| ✅ | 12 concepts publicitaires avec scripts | `PUBLICITE.md` |
| ✅ | 30 idées de contenu organique | `PUBLICITE.md` |
| ✅ | Outil « rapport d'eau » branché sur l'API du ministère | testé sur données réelles |
| ✅ | Prévisualisation statique hors Shopify | `index.html`, `produit.html` |

---

## ✅ Store ONDÉE — état réel au 28/08/2026

Store : **Ondee** · `krjwiu-zv.myshopify.com` · EUR · France · protégé par mot de passe.

| | Fait directement dans Shopify |
|---|---|
| ✅ | 3 produits actifs, 9 variantes, SKU, poids, SEO, prix barrés vérifiés |
| ✅ | Stock initial posé (100 / 175 / 100 unités) |
| ✅ | 3 collections, produits rattachés, publiées |
| ✅ | 8 pages — 5 publiées, 3 légales laissées en brouillon (marqueurs à compléter) |
| ✅ | Menu principal (5 entrées) et pied de page (10 entrées) reliés aux vraies ressources |
| ✅ | Thème **ONDÉE** installé (76 fichiers), non publié — à prévisualiser puis publier |
| ✅ | Livraison France : point relais 4,90 € · Colissimo 5,90 € · **offerte dès 49 €** |
| ✅ | Livraison UE 9,90 € · hors UE désactivé |
| ✅ | TVA « les prix incluent la taxe » déjà active |
| ✅ | Calcul de commande vérifié : 79 € TTC, livraison offerte au-dessus de 49 € |

## ⏳ Ce qui reste à faire — dans l'ordre

### Semaine 1 — le produit et la boutique

**1. Peupler le store ONDÉE — 5 minutes, en autonomie.**

Vous n'avez plus besoin que je sois connecté. Le script
**`ondee-import/setup-ondee.mjs`** fait tout le travail d'API à ma place :
produits, variantes, prix barrés, poids, collections, les 8 pages, les 2 menus,
la publication et le stock.

```bash
cd ondee-import
SHOP=votre-boutique.myshopify.com TOKEN=shpat_xxx node setup-ondee.mjs --dry-run
SHOP=votre-boutique.myshopify.com TOKEN=shpat_xxx node setup-ondee.mjs
```

Comment obtenir le jeton : `ondee-import/README.md`.

Trois garanties, toutes testées :
- **Il refuse d'écrire dans RÉVA** — il lit le nom du store et s'arrête (code 2).
- **Il est idempotent** — relancé, il met à jour au lieu de dupliquer.
- **Il laisse en brouillon toute page légale contenant encore un marqueur `[[…]]`.**

*Si vous préférez que je le fasse moi-même, il faut que le connecteur Shopify
soit ré-autorisé côté claude.ai sur le store ONDÉE — de mon côté l'appel
échoue toujours avec « token expired ».*

**2. Commander l'échantillon Calux.** 10 $, 3-5 jours par DHL.
Lien dans `DOSSIER.md` partie 4. Demandez **en même temps, par écrit** :
- le prix de la **cartouche seule** (non affiché sur la fiche) ;
- le prix de la **pomme de douche 3 jets** assortie ;
- les **certificats** : ACS, ou équivalent européen, ou a minima rapport d'essai
  NSF/ANSI 177 + fiches matières ABS.

**3. Tester l'échantillon.** Bandelette avant/après, débit au seau chronométré,
étanchéité à pleine pression. **S'il ne fait pas virer la bandelette, il est
éliminé** — quel que soit son prix.

### Semaine 2 — la structure juridique

**4. Créer la structure.** Micro-entreprise pour démarrer, ou SASU si vous
prévoyez d'investir. Le seuil de TVA compte : au-delà, la TVA à l'import
devient récupérable, ce qui change l'économie.

**5. Adhérer à Citeo ou Léko** et obtenir votre **Identifiant Unique ADEME**.
Obligatoire depuis 2022 pour tout metteur sur le marché en France, importateurs
compris.

**6. Remplir les pages légales.** Les fichiers de `ondee-pages/` contiennent des
marqueurs `[[…]]`. **Aucune page légale ne doit être publiée avec un marqueur
restant.** Liste complète dans `ondee-pages/00-LISEZ-MOI.md`.

### Semaines 3-5 — le stock et le contenu

**7. Commander 100 pièces** chez Calux (≈ 1 194 € rendus) + cartouches.
Payez par **PayPal** : c'est votre seule vraie protection sur une première
commande à un fournisseur inconnu.

**8. Acheter 500 bandelettes de test au chlore.** ≈ 80 €. C'est votre produit
marketing le plus important : deux dans chaque boîte.

**9. Produire les visuels.** Liste de prise de vue complète dans
`ondee-shopify/README.md` — 12 photos et 8 vidéos, toutes tournables au
téléphone. **La priorité absolue est la vidéo V1 : le test à la bandelette en
un seul plan.** C'est votre créatif n° 1.

### Semaine 6 — le lancement

**10. Configurer Shopify :** TVA « prix incluent la taxe » ✅, profils
d'expédition (offerte dès 49 €), moyens de paiement, applications (avis,
abonnement, upsell, bandeau cookies).

**11. Installer le thème.** `ondee-theme.zip` → Thèmes → Importer.
Importer `ondee-import/produits-ondee.csv`. Créer les pages depuis
`ondee-pages/`. Créer les menus `main-menu` et `footer`.

**12. Passer une commande test** avec une vraie carte, puis remboursez-la.
Vérifiez : e-mail de confirmation, étiquette de transport, TVA sur la facture.

**13. Lancer 1 500 € de test publicitaire** sur 3-4 semaines.
3 campagnes × 3 créatifs × 30 €/jour. Concepts 1, 3 et 8 en priorité.

---

## Le seuil de décision

> **Si après 1 500 € de test le CPA reste au-dessus de 30 € avec un panier
> moyen sous 75 €, arrêtez.** Le scénario prudent chiffré dans `DOSSIER.md`
> partie 5 est à l'équilibre à douze mois : il ne perd plus d'argent, mais il
> n'en gagne pas. Ce n'est pas un produit dont on force la rentabilité à coups
> de budget.

**Ce qu'il faut surveiller, dans cet ordre :** rétention à 3 secondes →
CTR sortant → taux d'ajout au panier → CPA → **part du pack SET à 79 €** dans
les commandes → **taux d'abonnement**.

Les deux derniers décident de tout.

---

## Les trois pièges à éviter

**1. Ne publiez aucun avis que vous n'avez pas reçu.** La section avis est
livrée vide exprès, et le JSON-LD n'a pas de note agrégée. C'est interdit
(directive Omnibus UE 2019/2161) et cela détruirait le seul actif de la marque.

**2. N'écrivez jamais « anti-calcaire ».** Ni dans une publicité, ni dans une
légende, ni dans une réponse en commentaire. C'est faux, c'est sanctionnable,
et c'est exactement ce contre quoi ONDÉE se construit.

**3. Ne recopiez pas le texte du fournisseur.** La fiche Calux parle d'eczéma
et de « water softening system ». Les deux sont interdits en France.
