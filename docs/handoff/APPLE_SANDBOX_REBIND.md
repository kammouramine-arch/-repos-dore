# Réconciliation Sandbox Apple — procédure opérateur

Contexte : pendant les essais TestFlight, un achat Apple **Sandbox** a été
rattaché à l'espace jetable `Bhjn` (`hhhh@gmail.com`, adresse non vérifiée,
créé le 5 septembre 2026). L'espace de test courant `Kamm`
(`kammouramine1010@gmail.com`) ne peut donc pas restaurer cet abonnement.

## Pourquoi libérer le lien ne suffit pas

Au moment de l'achat, l'application scelle l'espace acheteur dans la
transaction Apple (`appAccountToken: organizationId`, `apple-purchases.ts`).
Cette valeur est signée par Apple et ne peut pas être modifiée. Effacer
simplement `appleOriginalTransactionId` ferait donc passer la restauration de
`ORIGINAL_TRANSACTION_ALREADY_BOUND` à `APP_ACCOUNT_TOKEN_MISMATCH` : le même
refus, sous un autre nom.

## Ce qui a été ajouté

Une autorisation nominative, créée hors ligne, à usage unique et datée :
table `apple_sandbox_rebind_grants`. Le serveur ne la consulte que si les
trois verrous suivants sont réunis, chacun suffisant à refuser :

1. `APPLE_ALLOW_SANDBOX === 'true'` côté fournisseur ;
2. Apple atteste `environment === Sandbox` dans la transaction signée ;
3. une autorisation non consommée et non expirée existe pour ce couple
   exact transaction / espace cible.

Elle ne lève **que** la vérification de l'`appAccountToken`. Un abonnement
encore rattaché reste immuable dans tous les environnements : le serveur
refuse d'utiliser une autorisation tant qu'un lien vivant existe
(`mismatched && !binding`). Aucune route de l'API client n'écrit dans cette
table ; sa création passe uniquement par le script opérateur. La règle de
propriété en Production est inchangée.

Chaque usage écrit `audit_logs`
(`billing.apple.sandbox_rebind_consumed`) et marque `usedAt`.

## Séquence

1. **Simulation** (lecture seule, ne nécessite pas le déploiement) :

   ```
   DATABASE_URL=…  \
   REBIND_SOURCE_WORKSPACE=<identifiant de Bhjn>  \
   REBIND_TARGET_WORKSPACE=<identifiant de Kamm>  \
   REBIND_APPROVAL="approbation-proprietaire-2026-09-09"  \
   REBIND_PROVENANCE="incident-testflight-build-33"  \
   node scripts/apple-sandbox-rebind.mjs
   ```

2. Approbation explicite du propriétaire au vu de la simulation.
3. Déploiement du backend (la migration crée la table).
4. **Application** : même commande avec `REBIND_EXECUTE=YES_SANDBOX_ONLY`.
5. Restauration sur le Build 33 existant, sans nouveau build iOS.

## Ce qui n'est jamais touché

Aucun espace, membre, client, devis ou compte n'est supprimé. Le client et le
devis de `Bhjn` restent en place. L'abonnement source est archivé dans
`audit_logs` avec son instantané complet avant modification, ce qui permet une
reprise revue.

## Garde distincte de `sandbox-reset-guard.mjs`

`assertSandboxRebind` n'exige pas l'absence de données commerciales, parce
qu'aucune donnée n'est supprimée — cette exigence protège une suppression
d'espace, pas un changement de rattachement. Tous les autres verrous sont
conservés et l'attestation Sandbox reste la condition qui rend l'opération
impossible en Production.

## Défauts constatés dans `scripts/reset-disposable-sandbox.mjs`

Ce script antérieur ne peut pas s'exécuter en l'état :

- il lit `s.provider`, or `Subscription` n'a pas cette colonne ; `provider`
  est calculé dans la couche DTO. La garde lève donc toujours ;
- il exige `customers === 0 && quotes === 0`, alors que `Bhjn` porte un client
  et un devis.

Il n'a pas été modifié dans cette passe.
