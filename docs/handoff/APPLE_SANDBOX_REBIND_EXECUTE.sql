-- DEVISERA — Réconciliation Sandbox : APPLICATION.
-- Atomique : le bloc entier réussit ou ne laisse aucune trace.
-- Chaque garde lève une exception ; une transaction de Production est refusée.
-- Ne supprime aucun espace, membre, client, devis ni compte.
DO $$
DECLARE
  v_src_org uuid; v_tgt_org uuid; v_sub_id uuid; v_txn text; v_env text;
  v_snapshot jsonb;
  v_expires  timestamp(3) := (now() + interval '24 hours')::timestamp(3);
  v_approval   text := 'approbation-proprietaire-2026-09-09-rebind-sandbox';
  v_provenance text := 'incident-testflight-build-33-bhjn-vers-kamm';
BEGIN
  SELECT o.id, s.id, s."appleOriginalTransactionId", s."appleEnvironment", to_jsonb(s)
    INTO v_src_org, v_sub_id, v_txn, v_env, v_snapshot
  FROM organizations o JOIN subscriptions s ON s."organizationId" = o.id
  WHERE o.name = 'Bhjn'
  FOR UPDATE OF s;

  SELECT o.id INTO v_tgt_org FROM organizations o WHERE o.name = 'Kamm';

  IF v_src_org IS NULL THEN RAISE EXCEPTION 'Refus : espace source introuvable'; END IF;
  IF v_tgt_org IS NULL THEN RAISE EXCEPTION 'Refus : espace cible introuvable'; END IF;
  IF v_env IS DISTINCT FROM 'Sandbox' THEN
    RAISE EXCEPTION 'Refus : environnement % — seule une transaction Sandbox peut être réconciliée', coalesce(v_env, 'aucun');
  END IF;
  IF v_txn IS NULL THEN RAISE EXCEPTION 'Refus : aucun lien Apple sur l''espace source'; END IF;
  IF v_src_org = v_tgt_org THEN RAISE EXCEPTION 'Refus : espaces identiques'; END IF;
  IF EXISTS (SELECT 1 FROM subscriptions WHERE "organizationId" = v_tgt_org AND "appleOriginalTransactionId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Refus : l''espace cible possède déjà un abonnement Apple';
  END IF;
  IF EXISTS (SELECT 1 FROM subscriptions WHERE "organizationId" = v_tgt_org
             AND "stripeSubscriptionId" IS NOT NULL AND status IN ('active','past_due')) THEN
    RAISE EXCEPTION 'Refus : l''espace cible possède un abonnement web vivant';
  END IF;

  -- 1. Archive complète de la propriété précédente, avant toute modification.
  INSERT INTO audit_logs (id, "organizationId", action, "entityType", "entityId", metadata, "createdAt")
  VALUES (gen_random_uuid(), v_src_org, 'admin.apple.sandbox_binding_archived', 'Subscription', v_sub_id::text,
          jsonb_build_object('snapshot', v_snapshot, 'targetOrganizationId', v_tgt_org,
                             'approval', v_approval, 'provenance', v_provenance), now());

  -- 2. Libération du lien Apple. Aucune donnée commerciale n'est touchée.
  UPDATE subscriptions SET
    "appleOriginalTransactionId" = NULL,
    "appleProductId"             = NULL,
    "appleEnvironment"           = NULL,
    "appleSignedAt"              = NULL,
    status                       = 'canceled',
    "currentPeriodEnd"           = '1970-01-01 00:00:00'::timestamp(3),
    "trialEndsAt"                = NULL,
    "updatedAt"                  = now()
  WHERE id = v_sub_id;

  -- 3. Autorisation à usage unique, expirant dans 24 heures.
  INSERT INTO apple_sandbox_rebind_grants
    (id, "appleOriginalTransactionId", "targetOrganizationId", "previousOrganizationId",
     approval, provenance, "expiresAt", "createdAt")
  VALUES (gen_random_uuid(), v_txn, v_tgt_org, v_src_org, v_approval, v_provenance, v_expires, now())
  ON CONFLICT ("appleOriginalTransactionId", "targetOrganizationId")
  DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt", "usedAt" = NULL,
                approval = EXCLUDED.approval, provenance = EXCLUDED.provenance;

  RAISE NOTICE 'OK — lien Sandbox archivé. Autorisation valable jusqu''au %', v_expires;
END $$;

-- Contrôle après application (lecture seule).
SELECT o.name AS espace, s.status, s."appleEnvironment", s."appleOriginalTransactionId",
       (SELECT count(*) FROM customers WHERE "organizationId" = o.id) AS clients,
       (SELECT count(*) FROM quotes    WHERE "organizationId" = o.id) AS devis
FROM organizations o JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.name IN ('Bhjn','Kamm') ORDER BY o.name;

SELECT "targetOrganizationId", "previousOrganizationId", "expiresAt", "usedAt", right("appleOriginalTransactionId",4) AS txn_last4
FROM apple_sandbox_rebind_grants ORDER BY "createdAt" DESC LIMIT 3;
