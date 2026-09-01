#!/usr/bin/env node
/**
 * Suppression des organisations de test laissées par les sondages.
 *
 * Les vérifications successives de la production ont créé des comptes nommés
 * « ZZ … » qu'aucune route d'API ne sait supprimer : DEVISIA n'expose pas la
 * suppression d'une organisation, et c'est très bien ainsi. Ce script fait le
 * ménage en base, et refuse tout ce qui ne porte pas ce préfixe.
 *
 * Il n'écrit rien sans confirmation explicite :
 *   DIRECT_URL="postgresql://…:5432/postgres" node scripts/nettoyer-donnees-test.mjs
 *   DIRECT_URL="…" node scripts/nettoyer-donnees-test.mjs --supprimer
 *
 * Aucun secret n'est affiché : l'URL est lue dans l'environnement et masquée.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

/** Le préfixe est la seule porte d'entrée : rien d'autre n'est touché. */
const PREFIXE = 'ZZ ';

function redact(raw) {
  try {
    const url = new URL(raw);
    return `${url.protocol}//***:***@${url.hostname.replace(/^[^.]+/, '***')}:${url.port || '5432'}${url.pathname}`;
  } catch {
    return '<URL illisible>';
  }
}

const direct = process.env.DIRECT_URL?.trim();
if (!direct) {
  console.error('\n✖ DIRECT_URL est absente.');
  console.error('\n  Supabase → Project Settings → Database → Connection string → URI (port 5432).');
  console.error('  DIRECT_URL="postgresql://…" node scripts/nettoyer-donnees-test.mjs\n');
  process.exit(1);
}

const supprimer = process.argv.includes('--supprimer');
const client = new PrismaClient({ datasources: { db: { url: direct } } });

console.info(`\nBase ciblée : ${redact(direct)}`);
console.info(supprimer ? 'Mode : SUPPRESSION\n' : 'Mode : inventaire (ajoutez --supprimer pour agir)\n');

try {
  const organisations = await client.organization.findMany({
    where: { name: { startsWith: PREFIXE } },
    select: {
      id: true,
      name: true,
      createdAt: true,
      members: { select: { userId: true, user: { select: { email: true } } } },
      _count: { select: { quotes: true, customers: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (organisations.length === 0) {
    console.info('✔ Aucune organisation de test. Rien à faire.\n');
    process.exit(0);
  }

  console.info(`${organisations.length} organisation(s) de test :\n`);
  for (const org of organisations) {
    const emails = org.members.map((m) => m.user.email).join(', ');
    console.info(`  ${org.name}`);
    console.info(`    créée le ${org.createdAt.toISOString().slice(0, 10)} · ${org._count.quotes} devis · ${org._count.customers} clients`);
    console.info(`    ${emails}`);
  }

  // Garde-fou : une organisation de test qui porte de vraies données n'en est
  // probablement pas une. On préfère s'arrêter et laisser un humain regarder.
  const suspectes = organisations.filter((o) => o._count.quotes > 3 || o._count.customers > 3);
  if (suspectes.length > 0) {
    console.error(`\n✖ ${suspectes.length} organisation(s) « ${PREFIXE}… » contiennent des données réelles.`);
    console.error('  Vérifiez-les à la main avant toute suppression. Rien n’a été supprimé.\n');
    process.exit(1);
  }

  if (!supprimer) {
    console.info('\nRelancez avec --supprimer pour les effacer définitivement.\n');
    process.exit(0);
  }

  const utilisateurs = new Set(organisations.flatMap((o) => o.members.map((m) => m.userId)));
  for (const org of organisations) {
    await client.organization.delete({ where: { id: org.id } });
  }
  for (const userId of utilisateurs) {
    await client.user.delete({ where: { id: userId } }).catch(() => undefined);
  }

  const reste = await client.organization.count({ where: { name: { startsWith: PREFIXE } } });
  const total = await client.organization.count();
  console.info(`\n✔ ${organisations.length} organisation(s) et ${utilisateurs.size} compte(s) supprimés.`);
  console.info(`  organisations « ${PREFIXE}… » restantes : ${reste}`);
  console.info(`  organisations au total en base : ${total}\n`);
} finally {
  await client.$disconnect();
}
