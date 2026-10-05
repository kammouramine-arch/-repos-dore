# Revenue Audit — données

Deux circuits, un seul rendu (`src/components/audit/AuditDocument.tsx`) :

| | Exemple fictif | Audit de prospect réel |
|---|---|---|
| Données | `elan-habitat.*.ts` (en clair, dans le dépôt) | JSON en clair **hors du dépôt** (`private-audits/`, ignoré par Git) |
| Publié | tel quel | **chiffré** (`sealed/<identifiant>.json`) |
| Adresse | `/audit/<slug>` | `/audit/p/<identifiant>#k=<clé>` |
| Lecture | publique (noindex) | qui possède le lien complet |

## Préparer et publier un audit réel

1. Copier `audit-template.json` dans `private-audits/<entreprise>.json` et le compléter
   (même schéma que `src/lib/audit/types.ts`). Garder l'original dans un stockage privé
   (pas dans le dépôt).
2. `npm run audit:seal -- private-audits/<entreprise>.json`
   - valide l'audit (forme, sources, notes, recommandations) ;
   - écrit `sealed/<identifiant>.json` (texte chiffré, identifiant aléatoire) ;
   - affiche le **lien privé**. La clé n'existe que dans ce lien : le conserver en lieu sûr.
3. Commit du fichier scellé, déploiement, envoi du lien.

Révoquer un lien : `npm run audit:seal -- <fichier> --id <identifiant>` (nouvelle clé,
l'ancien lien ne fonctionne plus) ou supprimer le fichier scellé, puis redéployer.

## Règles de contenu (vérifiées automatiquement)

- `observations` : **observé** = au moins une source externe vérifiable
  (`website`, `public_listing`, `public_document`) ; **communiqué** = au moins une source
  venant de l'entreprise (`call`, `questionnaire`, `company_document`).
- Une piste non vérifiée va dans `hypotheses`, avec la manière de la valider ;
  une note ne peut pas reposer **uniquement** sur des hypothèses.
- Aucun chiffre inventé : valeur inconnue = `null`. Domaine non évaluable = `points: null`
  (exclu du score). Moins de 4 domaines évalués sur 7 : aucun score affiché.
- Score, niveau, point fort, priorités et feuille de route sont **calculés**
  (`src/lib/audit/model.ts`), jamais saisis.
- Logo : uniquement avec l'accord de l'entreprise (`logo.permission: true`).
- `notes` : notes internes, jamais affichées.

## Ce que la protection fait — et ne fait pas

- Pages `noindex, nofollow` (balise + en-tête `X-Robots-Tag`), absentes du plan du site et de
  la navigation, `Referrer-Policy: no-referrer`, titre neutre (aucun nom de prospect).
- Le dépôt et le site ne contiennent que du texte chiffré ; la clé (après `#`) n'est jamais
  envoyée au serveur.
- **Ce n'est pas une authentification** : toute personne qui obtient le lien complet peut lire
  l'audit. Pas de traçage d'accès, pas d'expiration automatique.
- Pour un vrai contrôle d'accès plus tard, remplacer `openSealedAudit` / `getSealed`
  (`src/lib/audit/seal.ts`, `src/lib/audit/sealed.ts`) — le rendu ne change pas.
