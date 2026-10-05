# Revenue Audit — ajouter un audit

Un audit = un fichier de données, rendu par des composants génériques
(`src/components/audit/`). Modèle : `elan-habitat.fr.ts` (exemple fictif).

1. Copier l'exemple dans `src/content/audits/<entreprise>.ts`, remplacer
   **tout** son contenu. Mettre `fictional: false`, `status: "draft"` tant
   que l'audit n'est pas relu, puis `"ready"`. `"archived"` retire la page.
2. Choisir une adresse **difficile à deviner** : `slug: "<entreprise>-<8 caractères aléatoires>"`
   (par ex. `node -e "console.log(require('crypto').randomBytes(6).toString('base64url').toLowerCase())"`).
   L'audit est servi à `/audit/<slug>` (français) ou `/en/audit/<slug>` (anglais), selon `locale`.
3. L'ajouter à la liste `AUDITS` de `index.ts`, puis `npm test` : les tests
   refusent un audit incohérent (source citée inexistante, observation sans
   source, note hors barème, recommandation sans fondement…).

## Règles de contenu

- `observations` : uniquement ce qui a été **observé** (avec une source
  vérifiable) ou **communiqué** par l'entreprise. Une piste non vérifiée va
  dans `hypotheses`, avec la manière de la valider.
- Aucun chiffre inventé : une valeur inconnue reste `null` (« non communiqué »).
  Une catégorie non évaluable garde `points: null` : elle ne pèse pas sur le score.
- Le score, le niveau, le point fort, les priorités et la feuille de route
  sont **calculés** (`src/lib/audit/model.ts`), jamais saisis.
- Logo : seulement avec l'accord de l'entreprise (`logo.permission: true`).
- `notes` : notes internes, jamais affichées.

## Confidentialité — ce que le site fait, et ce qu'il ne fait pas

- Pages en `noindex, nofollow` (balise et en-tête `X-Robots-Tag`), absentes
  du plan du site et de la navigation, `Referrer-Policy: no-referrer`.
- Les données d'un audit ne sont envoyées au navigateur que sur sa propre page.
- **Ce n'est pas une authentification** : toute personne qui possède le lien
  peut lire l'audit. Ne pas y mettre d'information que l'entreprise n'a pas
  accepté de voir circuler par lien.
- Les fichiers d'audit sont dans le dépôt Git : toute personne ayant accès
  au dépôt peut les lire.
- Ne jamais ajouter l'adresse d'un audit de prospect dans `SAMPLE_AUDIT`
  (`src/lib/i18n/routes.ts`) : ce fichier est envoyé au navigateur.
