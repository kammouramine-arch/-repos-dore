/**
 * Réconciliation Sandbox — opérateur seulement, aucune route HTTP.
 *
 * Par défaut, le script ne fait que LIRE et n'affiche que ce qu'il changerait.
 * Rien n'est modifié sans `REBIND_EXECUTE=YES_SANDBOX_ONLY`.
 *
 * Fournissez les identifiants par variables d'environnement, jamais en
 * argument de ligne de commande :
 *   DATABASE_URL             connexion privée
 *   REBIND_SOURCE_WORKSPACE  identifiant de l'espace détenteur actuel
 *   REBIND_TARGET_WORKSPACE  identifiant de l'espace de test à rattacher
 *   REBIND_APPROVAL          référence d'approbation du propriétaire
 *   REBIND_PROVENANCE        origine de la demande
 *   REBIND_EXECUTE           « YES_SANDBOX_ONLY » pour appliquer
 */
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { assertSandboxRebind } from './sandbox-rebind-guard.mjs';

const db = new PrismaClient();
const source = process.env.REBIND_SOURCE_WORKSPACE;
const target = process.env.REBIND_TARGET_WORKSPACE;
const approval = process.env.REBIND_APPROVAL;
const provenance = process.env.REBIND_PROVENANCE;
const execute = process.env.REBIND_EXECUTE === 'YES_SANDBOX_ONLY';
const GRANT_HOURS = 24;

const reference = (value) => createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
const maskTransaction = (value) =>
  value ? `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)} (longueur ${value.length}, référence ${reference(value)})` : 'aucun';

async function workspace(tx, id) {
  const organization = await tx.organization.findUnique({ where: { id } });
  if (!organization) throw new Error(`Espace introuvable : ${id}`);
  const subscription = await tx.subscription.findUnique({ where: { organizationId: id } });
  if (!subscription) throw new Error(`Abonnement introuvable pour l'espace ${id}`);
  const [customers, quotes, members] = await Promise.all([
    tx.customer.count({ where: { organizationId: id } }),
    tx.quote.count({ where: { organizationId: id } }),
    tx.organizationMember.count({ where: { organizationId: id, deletedAt: null } }),
  ]);
  return { organization, subscription, customers, quotes, members };
}

function describe(label, w) {
  const s = w.subscription;
  console.log(`\n${label}`);
  console.log(`  espace                       ${w.organization.name}  (${w.organization.id})`);
  console.log(`  membres / clients / devis    ${w.members} / ${w.customers} / ${w.quotes}`);
  console.log(`  référence espace (journaux)  ${reference(w.organization.id)}`);
  console.log(`  abonnement                   ${s.id}`);
  console.log(`  plan / statut                ${s.plan} / ${s.status}`);
  console.log(`  appleEnvironment             ${s.appleEnvironment ?? 'NULL'}`);
  console.log(`  appleProductId               ${s.appleProductId ?? 'NULL'}`);
  console.log(`  appleOriginalTransactionId   ${maskTransaction(s.appleOriginalTransactionId)}`);
  console.log(`  appleSignedAt                ${s.appleSignedAt?.toISOString() ?? 'NULL'}`);
  console.log(`  currentPeriodEnd             ${s.currentPeriodEnd?.toISOString() ?? 'NULL'}`);
  console.log(`  trialEndsAt                  ${s.trialEndsAt?.toISOString() ?? 'NULL'}`);
  console.log(`  cancelAtPeriodEnd            ${s.cancelAtPeriodEnd}`);
  console.log(`  stripeSubscriptionId         ${s.stripeSubscriptionId ? 'présent' : 'NULL'}`);
}

try {
  if (!source || !target) throw new Error('REBIND_SOURCE_WORKSPACE et REBIND_TARGET_WORKSPACE sont requis');

  await db.$transaction(async (tx) => {
    const from = await workspace(tx, source);
    const to = await workspace(tx, target);

    assertSandboxRebind({
      environment: from.subscription.appleEnvironment,
      originalTransactionId: from.subscription.appleOriginalTransactionId,
      sourceOrganizationId: from.organization.id,
      targetOrganizationId: to.organization.id,
      targetHasAppleBinding: Boolean(to.subscription.appleOriginalTransactionId),
      targetStripeSubscriptionId: to.subscription.stripeSubscriptionId,
      targetStatus: to.subscription.status,
      approval,
      provenance,
    });

    describe('DÉTENTEUR ACTUEL (source)', from);
    describe('ESPACE DE TEST (cible)', to);

    console.log('\nPROPRIÉTÉ appAccountToken');
    console.log('  Apple scelle l’appAccountToken de l’espace acheteur dans la transaction.');
    console.log('  Ce lien n’a pu être créé que si l’appAccountToken valait alors l’espace source :');
    console.log(`  appAccountToken attendu      ${from.organization.id}  (${from.organization.name})`);
    console.log(`  espace restaurateur          ${to.organization.id}  (${to.organization.name})`);
    console.log('  → sans autorisation, la restauration échoue en APP_ACCOUNT_TOKEN_MISMATCH.');

    const expiresAt = new Date(Date.now() + GRANT_HOURS * 3600_000);
    console.log('\nMODIFICATIONS PROPOSÉES');
    console.log(`  1. audit_logs : nouvelle ligne « admin.apple.sandbox_binding_archived » avec l’instantané complet de l’abonnement source.`);
    console.log(`  2. subscriptions (${from.subscription.id}) — espace ${from.organization.name} :`);
    console.log(`       appleOriginalTransactionId   ${maskTransaction(from.subscription.appleOriginalTransactionId)}  →  NULL`);
    console.log(`       appleProductId               ${from.subscription.appleProductId ?? 'NULL'}  →  NULL`);
    console.log(`       appleEnvironment             ${from.subscription.appleEnvironment ?? 'NULL'}  →  NULL`);
    console.log(`       appleSignedAt                ${from.subscription.appleSignedAt?.toISOString() ?? 'NULL'}  →  NULL`);
    console.log(`       status                       ${from.subscription.status}  →  canceled`);
    console.log(`       currentPeriodEnd             ${from.subscription.currentPeriodEnd?.toISOString() ?? 'NULL'}  →  1970-01-01T00:00:00.000Z`);
    console.log(`       trialEndsAt                  ${from.subscription.trialEndsAt?.toISOString() ?? 'NULL'}  →  NULL`);
    console.log(`  3. apple_sandbox_rebind_grants : autorisation à usage unique`);
    console.log(`       transaction                  ${maskTransaction(from.subscription.appleOriginalTransactionId)}`);
    console.log(`       espace cible                 ${to.organization.id}  (${to.organization.name})`);
    console.log(`       expire le                    ${expiresAt.toISOString()}  (${GRANT_HOURS} h)`);
    console.log('\nNON MODIFIÉ : aucun espace, membre, client, devis ou compte n’est supprimé.');
    console.log('NON MODIFIÉ : la vérification de propriété en Production reste identique.');

    if (!execute) {
      console.log('\n=== SIMULATION — aucune écriture effectuée ===');
      console.log('Pour appliquer après approbation : REBIND_EXECUTE=YES_SANDBOX_ONLY');
      throw Object.assign(new Error('DRY_RUN'), { dryRun: true });
    }

    await tx.$queryRaw`SELECT id FROM subscriptions WHERE "organizationId" = ${source}::uuid FOR UPDATE`;
    await tx.auditLog.create({ data: {
      organizationId: from.organization.id,
      action: 'admin.apple.sandbox_binding_archived',
      entityType: 'Subscription',
      entityId: from.subscription.id,
      metadata: {
        snapshot: JSON.parse(JSON.stringify(from.subscription)),
        targetOrganizationId: to.organization.id,
        approval,
        provenance,
      },
    } });
    await tx.subscription.update({ where: { id: from.subscription.id }, data: {
      appleOriginalTransactionId: null,
      appleProductId: null,
      appleEnvironment: null,
      appleSignedAt: null,
      status: 'canceled',
      currentPeriodEnd: new Date(0),
      trialEndsAt: null,
    } });
    // SQL direct : l'autorisation peut être créée sans régénérer le client Prisma.
    await tx.$executeRaw`
      INSERT INTO apple_sandbox_rebind_grants
        ("id", "appleOriginalTransactionId", "targetOrganizationId", "previousOrganizationId", "approval", "provenance", "expiresAt")
      VALUES (${randomUUID()}::uuid, ${from.subscription.appleOriginalTransactionId}, ${target}::uuid, ${source}::uuid, ${approval}, ${provenance}, ${expiresAt})
      ON CONFLICT ("appleOriginalTransactionId", "targetOrganizationId")
      DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt", "usedAt" = NULL, "approval" = EXCLUDED."approval", "provenance" = EXCLUDED."provenance"`;
    console.log('\n=== APPLIQUÉ ===');
    console.log('Lien Sandbox archivé et autorisation à usage unique créée. Aucun compte supprimé.');
  }, { isolationLevel: 'Serializable', timeout: 20_000 });
} catch (error) {
  if (error?.dryRun) process.exitCode = 0;
  else { console.error(`\nÉCHEC : ${error?.message ?? error}`); process.exitCode = 1; }
} finally {
  await db.$disconnect();
}
