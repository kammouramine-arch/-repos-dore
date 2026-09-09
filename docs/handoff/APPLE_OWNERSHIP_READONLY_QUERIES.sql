-- DEVISERA — Apple ownership trace. READ-ONLY (SELECT only, no writes).
-- Run in: Supabase Dashboard -> SQL Editor (project zrwpmkvkpgocuaroskss).
-- No connection string, password or key needs to leave your machine.

-- ============================================================
-- QUERY 1 — Who owns every Apple-bound subscription
-- ============================================================
SELECT
  o.name                                   AS workspace,
  o.slug                                   AS workspace_slug,
  s."organizationId",
  u.email                                  AS owner_email,
  u."createdAt"                            AS owner_created,
  (u."emailVerifiedAt" IS NOT NULL)        AS owner_verified,
  s."appleEnvironment",
  s."appleProductId",
  s.status,
  s."currentPeriodEnd",
  s."trialEndsAt",
  s."cancelAtPeriodEnd",
  s."appleSignedAt",
  s."createdAt"                            AS subscription_created,
  o."deletedAt"                            AS workspace_deleted_at,
  -- Matches the hashed reference printed in the server logs.
  left(encode(sha256(convert_to(s."appleOriginalTransactionId", 'UTF8')), 'hex'), 12) AS txn_log_reference,
  left(encode(sha256(convert_to(s."organizationId", 'UTF8')), 'hex'), 12)             AS workspace_log_reference,
  -- Identifier kept masked on purpose; length + last 4 are enough to correlate.
  length(s."appleOriginalTransactionId")   AS txn_length,
  right(s."appleOriginalTransactionId", 4) AS txn_last4
FROM subscriptions s
JOIN organizations o          ON o.id = s."organizationId"
LEFT JOIN organization_members m ON m."organizationId" = o.id
                                AND m.role = 'OWNER'
                                AND m."deletedAt" IS NULL
LEFT JOIN users u             ON u.id = m."userId"
WHERE s."appleOriginalTransactionId" IS NOT NULL
ORDER BY s."appleSignedAt" DESC NULLS LAST;


-- ============================================================
-- QUERY 2 — The workspaces YOUR TestFlight login belongs to
-- Replace the email below with the account you used in Build 33.
-- ============================================================
SELECT
  u.email,
  o.name                        AS workspace,
  o.id                          AS organization_id,
  m.role,
  s.status,
  s."appleEnvironment",
  s."appleProductId",
  s."currentPeriodEnd",
  (s."appleOriginalTransactionId" IS NOT NULL) AS has_apple_binding,
  left(encode(sha256(convert_to(o.id, 'UTF8')), 'hex'), 12) AS workspace_log_reference
FROM users u
JOIN organization_members m ON m."userId" = u.id AND m."deletedAt" IS NULL
JOIN organizations o        ON o.id = m."organizationId"
LEFT JOIN subscriptions s   ON s."organizationId" = o.id
WHERE lower(u.email) = lower('PUT-YOUR-BUILD-33-LOGIN-EMAIL-HERE')
ORDER BY o."createdAt";


-- ============================================================
-- QUERY 3 — Is the owning workspace disposable test data?
-- ============================================================
SELECT
  o.name                     AS workspace,
  o.id                       AS organization_id,
  o."createdAt"              AS workspace_created,
  count(DISTINCT c.id)       AS customers,
  count(DISTINCT q.id)       AS quotes,
  count(DISTINCT m."userId") AS members,
  min(u.email)               AS a_member_email
FROM organizations o
LEFT JOIN customers c            ON c."organizationId" = o.id
LEFT JOIN quotes q               ON q."organizationId" = o.id
LEFT JOIN organization_members m ON m."organizationId" = o.id AND m."deletedAt" IS NULL
LEFT JOIN users u                ON u.id = m."userId"
WHERE o.id IN (SELECT "organizationId" FROM subscriptions WHERE "appleOriginalTransactionId" IS NOT NULL)
GROUP BY o.id, o.name, o."createdAt"
ORDER BY o."createdAt";
