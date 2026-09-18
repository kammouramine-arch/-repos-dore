-- DEVISERA — Réconciliation Sandbox : SIMULATION. LECTURE SEULE (SELECT only).
-- Aucune écriture. À exécuter dans Supabase -> SQL Editor.
-- Remplacez les deux noms si vos espaces changent.

WITH params AS (
  SELECT 'Bhjn'::text AS source_name, 'Kamm'::text AS target_name
),
src AS (
  SELECT o.id AS org_id, o.name AS org_name, s.*
  FROM params p
  JOIN organizations o ON o.name = p.source_name
  JOIN subscriptions s ON s."organizationId" = o.id
),
tgt AS (
  SELECT o.id AS org_id, o.name AS org_name, s.*
  FROM params p
  JOIN organizations o ON o.name = p.target_name
  JOIN subscriptions s ON s."organizationId" = o.id
),
counts AS (
  SELECT
    (SELECT count(*) FROM customers            WHERE "organizationId" = (SELECT org_id FROM src)) AS src_customers,
    (SELECT count(*) FROM quotes               WHERE "organizationId" = (SELECT org_id FROM src)) AS src_quotes,
    (SELECT count(*) FROM organization_members WHERE "organizationId" = (SELECT org_id FROM src) AND "deletedAt" IS NULL) AS src_members
)
SELECT * FROM (
  -- 1. Vérifications de sûreté : tout doit être « OK ».
  SELECT 1 AS ordre, 'GARDE' AS section, 'environnement Apple attesté' AS element,
         CASE WHEN (SELECT "appleEnvironment" FROM src) = 'Sandbox'
              THEN 'OK — Sandbox' ELSE 'REFUS — ' || coalesce((SELECT "appleEnvironment" FROM src), 'aucun') END AS valeur
  UNION ALL SELECT 2, 'GARDE', 'espace source porte un lien Apple',
         CASE WHEN (SELECT "appleOriginalTransactionId" FROM src) IS NOT NULL THEN 'OK' ELSE 'REFUS — aucun lien' END
  UNION ALL SELECT 3, 'GARDE', 'espaces distincts',
         CASE WHEN (SELECT org_id FROM src) <> (SELECT org_id FROM tgt) THEN 'OK' ELSE 'REFUS — identiques' END
  UNION ALL SELECT 4, 'GARDE', 'espace cible sans abonnement Apple',
         CASE WHEN (SELECT "appleOriginalTransactionId" FROM tgt) IS NULL THEN 'OK' ELSE 'REFUS — déjà rattaché' END
  UNION ALL SELECT 5, 'GARDE', 'espace cible sans abonnement web vivant',
         CASE WHEN (SELECT "stripeSubscriptionId" FROM tgt) IS NULL
               OR (SELECT status::text FROM tgt) NOT IN ('active','past_due') THEN 'OK' ELSE 'REFUS — abonnement web' END

  -- 2. Détenteur actuel.
  UNION ALL SELECT 10, 'SOURCE', 'espace',                      (SELECT org_name || '  (' || org_id || ')' FROM src)
  UNION ALL SELECT 11, 'SOURCE', 'abonnement (id)',             (SELECT id::text FROM src)
  UNION ALL SELECT 12, 'SOURCE', 'membres / clients / devis',   (SELECT src_members || ' / ' || src_customers || ' / ' || src_quotes FROM counts)
  UNION ALL SELECT 13, 'SOURCE', 'plan / statut',               (SELECT plan::text || ' / ' || status::text FROM src)
  UNION ALL SELECT 14, 'SOURCE', 'appleEnvironment',            (SELECT coalesce("appleEnvironment",'NULL') FROM src)
  UNION ALL SELECT 15, 'SOURCE', 'appleProductId',              (SELECT coalesce("appleProductId",'NULL') FROM src)
  UNION ALL SELECT 16, 'SOURCE', 'transaction (masquée)',
         (SELECT repeat('•', greatest(0, length("appleOriginalTransactionId") - 4)) || right("appleOriginalTransactionId", 4)
                 || '  (longueur ' || length("appleOriginalTransactionId")
                 || ', référence ' || left(encode(sha256(convert_to("appleOriginalTransactionId",'UTF8')),'hex'),12) || ')' FROM src)
  UNION ALL SELECT 17, 'SOURCE', 'appleSignedAt',               (SELECT coalesce("appleSignedAt"::text,'NULL') FROM src)
  UNION ALL SELECT 18, 'SOURCE', 'currentPeriodEnd',            (SELECT coalesce("currentPeriodEnd"::text,'NULL') FROM src)
  UNION ALL SELECT 19, 'SOURCE', 'trialEndsAt',                 (SELECT coalesce("trialEndsAt"::text,'NULL') FROM src)

  -- 3. Espace de test cible.
  UNION ALL SELECT 30, 'CIBLE', 'espace',                       (SELECT org_name || '  (' || org_id || ')' FROM tgt)
  UNION ALL SELECT 31, 'CIBLE', 'abonnement (id)',              (SELECT id::text FROM tgt)
  UNION ALL SELECT 32, 'CIBLE', 'plan / statut',                (SELECT plan::text || ' / ' || status::text FROM tgt)
  UNION ALL SELECT 33, 'CIBLE', 'lien Apple actuel',            (SELECT coalesce("appleOriginalTransactionId",'aucun') FROM tgt)

  -- 4. Propriété appAccountToken (déduite : le lien n'a pu naître que si elle valait l'espace source).
  UNION ALL SELECT 40, 'appAccountToken', 'valeur scellée par Apple',   (SELECT org_id || '  (' || org_name || ')' FROM src)
  UNION ALL SELECT 41, 'appAccountToken', 'espace qui restaure',        (SELECT org_id || '  (' || org_name || ')' FROM tgt)
  UNION ALL SELECT 42, 'appAccountToken', 'sans autorisation',          'APP_ACCOUNT_TOKEN_MISMATCH — 409'

  -- 5. Modifications proposées (aucune n'est appliquée par ce script).
  UNION ALL SELECT 50, 'PROPOSÉ', 'audit_logs',                 'nouvelle ligne admin.apple.sandbox_binding_archived (instantané complet)'
  UNION ALL SELECT 51, 'PROPOSÉ', 'src.appleOriginalTransactionId', (SELECT right("appleOriginalTransactionId",4) FROM src) || '  ->  NULL'
  UNION ALL SELECT 52, 'PROPOSÉ', 'src.appleProductId',         (SELECT coalesce("appleProductId",'NULL') FROM src) || '  ->  NULL'
  UNION ALL SELECT 53, 'PROPOSÉ', 'src.appleEnvironment',       (SELECT coalesce("appleEnvironment",'NULL') FROM src) || '  ->  NULL'
  UNION ALL SELECT 54, 'PROPOSÉ', 'src.appleSignedAt',          (SELECT coalesce("appleSignedAt"::text,'NULL') FROM src) || '  ->  NULL'
  UNION ALL SELECT 55, 'PROPOSÉ', 'src.status',                 (SELECT status::text FROM src) || '  ->  canceled'
  UNION ALL SELECT 56, 'PROPOSÉ', 'src.currentPeriodEnd',       (SELECT coalesce("currentPeriodEnd"::text,'NULL') FROM src) || '  ->  1970-01-01'
  UNION ALL SELECT 57, 'PROPOSÉ', 'src.trialEndsAt',            (SELECT coalesce("trialEndsAt"::text,'NULL') FROM src) || '  ->  NULL'
  UNION ALL SELECT 58, 'PROPOSÉ', 'apple_sandbox_rebind_grants','autorisation à usage unique, 24 h, vers ' || (SELECT org_name FROM tgt)
  UNION ALL SELECT 59, 'PROPOSÉ', 'NON supprimé',               'aucun espace, membre, client, devis ou compte'
) rapport
ORDER BY ordre;
