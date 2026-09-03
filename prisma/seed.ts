/**
 * Données de démonstration DEVISIA.
 *
 * Réservées au développement : le script refuse de s'exécuter en production et
 * n'injecte jamais de données dans une organisation existante — il crée sa
 * propre entreprise de démonstration, « Plomberie Martin ».
 */
import { PrismaClient, type PrismaClient as Client } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@devisia.fr';
const DEMO_PASSWORD = 'devisia-demo-2026';
const DEMO_SLUG = 'plomberie-martin-demo';

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function token() {
  return randomBytes(24).toString('base64url');
}

const CATALOG = [
  { name: 'Main-d’œuvre plombier', category: 'MAIN_OEUVRE', unit: 'h', cost: 2200, sale: 5500, keywords: ['main', 'oeuvre', 'heure', 'plombier', 'intervention'] },
  { name: 'Déplacement et prise en charge', category: 'SERVICE', unit: 'u', cost: 0, sale: 4500, keywords: ['deplacement', 'forfait', 'depannage'] },
  { name: 'Siphon évier laiton', category: 'MATERIAU', unit: 'u', cost: 1400, sale: 3200, keywords: ['siphon', 'evier', 'bonde'] },
  { name: 'Flexible sanitaire inox 50 cm', category: 'MATERIAU', unit: 'u', cost: 600, sale: 1500, keywords: ['flexible', 'raccord', 'inox'] },
  { name: 'Mitigeur évier chromé', category: 'MATERIAU', unit: 'u', cost: 5800, sale: 12500, keywords: ['mitigeur', 'robinet', 'evier'] },
  { name: 'Chauffe-eau électrique 200 L', category: 'MATERIAU', unit: 'u', cost: 48000, sale: 79000, keywords: ['chauffe', 'eau', 'ballon', 'cumulus', '200'] },
  { name: 'Installation chauffe-eau 200 L', category: 'SERVICE', unit: 'u', cost: 65000, sale: 95000, keywords: ['installation', 'chauffe', 'eau', 'pose', 'ballon'] },
  { name: 'Groupe de sécurité', category: 'MATERIAU', unit: 'u', cost: 1800, sale: 4200, keywords: ['groupe', 'securite', 'soupape'] },
  { name: 'Recherche de fuite', category: 'SERVICE', unit: 'u', cost: 0, sale: 18000, keywords: ['recherche', 'fuite', 'diagnostic'] },
  { name: 'Remplacement WC suspendu', category: 'PACK', unit: 'u', cost: 32000, sale: 62000, keywords: ['wc', 'toilette', 'suspendu', 'bati'] },
  { name: 'Débouchage canalisation', category: 'SERVICE', unit: 'u', cost: 0, sale: 19000, keywords: ['debouchage', 'canalisation', 'bouchon', 'evacuation'] },
  { name: 'Robinet thermostatique radiateur', category: 'MATERIAU', unit: 'u', cost: 2400, sale: 5800, keywords: ['robinet', 'thermostatique', 'radiateur', 'chauffage'] },
];

async function reset(client: Client) {
  const existing = await client.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    await client.organization.delete({ where: { id: existing.id } });
  }
  await client.user.deleteMany({ where: { email: DEMO_EMAIL } });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de démonstration ne doit pas être exécuté en production.');
  }

  await reset(prisma);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      firstName: 'Karim',
      lastName: 'Benali',
      phone: '06 12 34 56 78',
      emailVerifiedAt: new Date(),
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: 'Plomberie Martin',
      slug: DEMO_SLUG,
      members: { create: { userId: user.id, role: 'OWNER' } },
      settings: { create: {} },
      subscription: {
        create: {
          plan: 'PRO',
          status: 'trialing',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
      businessProfile: {
        create: {
          legalName: 'Plomberie Martin',
          ownerName: 'Karim Benali',
          email: 'contact@plomberie-martin.fr',
          phone: '01 23 45 67 89',
          addressLine1: '12 rue des Artisans',
          postalCode: '69003',
          city: 'Lyon',
          siret: '812 345 678 00019',
          vatNumber: 'FR12812345678',
          insurance: 'Décennale AXA n° 1234567 — Lyon',
          trade: 'PLOMBIER',
          defaultHourlyCents: 5500,
          paymentTerms: 'Acompte de 30 % à la commande, solde à la fin des travaux. Paiement à 30 jours.',
          quoteTerms:
            "Devis valable sous réserve d'accessibilité du chantier. Les travaux non décrits (reprise de carrelage, peinture, maçonnerie) ne sont pas inclus. Toute modification fera l'objet d'un avenant.",
          quoteValidityDays: 30,
          brandColor: '#2547E0',
          onboardingCompleted: true,
        },
      },
    },
  });

  await prisma.automation.createMany({
    data: [
      { organizationId: organization.id, name: 'Devis non consulté après 24 h', trigger: 'DEVIS_NON_CONSULTE', delayHours: 24, isActive: true },
      { organizationId: organization.id, name: 'Devis consulté sans réponse après 3 jours', trigger: 'DEVIS_CONSULTE_SANS_REPONSE', delayHours: 72, isActive: true },
      { organizationId: organization.id, name: 'Dernière relance après 7 jours', trigger: 'DEVIS_SANS_REPONSE', delayHours: 168, isActive: false },
    ],
  });

  await prisma.priceBookItem.createMany({
    data: CATALOG.map((item, index) => ({
      organizationId: organization.id,
      reference: `PM-${String(index + 1).padStart(3, '0')}`,
      name: item.name,
      category: item.category as 'MATERIAU' | 'SERVICE' | 'MAIN_OEUVRE' | 'PACK',
      unit: item.unit,
      costPriceCents: item.cost,
      salePriceCents: item.sale,
      vatRate: 10,
      keywords: item.keywords,
    })),
  });

  const customers = await Promise.all(
    [
      { firstName: 'Paul', lastName: 'Roussel', email: 'paul.roussel@example.fr', phone: '06 22 33 44 55', city: 'Lyon', postalCode: '69006', addressLine1: '8 rue Vendôme' },
      { firstName: 'Marie', lastName: 'Delaunay', email: 'marie.delaunay@example.fr', phone: '06 77 88 99 00', city: 'Villeurbanne', postalCode: '69100', addressLine1: '24 cours Émile Zola' },
      { companyName: 'Boulangerie Lemoine', firstName: 'Sophie', lastName: 'Lemoine', email: 'contact@boulangerie-lemoine.fr', phone: '04 78 00 11 22', city: 'Lyon', postalCode: '69007', addressLine1: '3 avenue Jean Jaurès' },
      { firstName: 'Ahmed', lastName: 'Ferrand', email: 'a.ferrand@example.fr', phone: '07 60 12 34 56', city: 'Bron', postalCode: '69500', addressLine1: '15 rue de la République' },
    ].map((customer) =>
      prisma.customer.create({
        data: { ...customer, organizationId: organization.id, source: 'MANUEL' },
      }),
    ),
  );

  await prisma.lead.createMany({
    data: [
      {
        organizationId: organization.id,
        contactName: 'Julie Marchand',
        title: 'Remplacement chauffe-eau 200 L',
        description: "Le chauffe-eau de 200 litres fuit par le bas. Installation dans un garage, accès facile.",
        phone: '06 45 67 89 01',
        email: 'julie.marchand@example.fr',
        city: 'Lyon',
        postalCode: '69008',
        status: 'NOUVEAU',
        source: 'FORMULAIRE_WEB',
        estimatedCents: 120000,
        lastActivityAt: daysAgo(1),
      },
      {
        organizationId: organization.id,
        contactName: 'Cabinet Vidal',
        title: 'Débouchage canalisation cuisine',
        description: 'Évier bouché dans la cuisine du cabinet, intervention souhaitée rapidement.',
        phone: '04 72 11 22 33',
        city: 'Lyon',
        postalCode: '69002',
        status: 'CONTACTE',
        source: 'TELEPHONE',
        estimatedCents: 25000,
        lastActivityAt: daysAgo(3),
      },
      {
        organizationId: organization.id,
        contactName: 'Résidence Les Tilleuls',
        title: 'Remplacement robinets thermostatiques (12 radiateurs)',
        phone: '04 78 55 66 77',
        city: 'Villeurbanne',
        postalCode: '69100',
        status: 'QUALIFIE',
        source: 'EMAIL',
        estimatedCents: 180000,
        lastActivityAt: daysAgo(6),
      },
    ],
  });

  const catalog = await prisma.priceBookItem.findMany({ where: { organizationId: organization.id } });
  const byName = new Map(catalog.map((item) => [item.name, item]));

  interface SeedQuote {
    customerIndex: number;
    number: string;
    title: string;
    summary: string;
    status: 'BROUILLON' | 'ENVOYE' | 'CONSULTE' | 'ACCEPTE' | 'REFUSE';
    sentDaysAgo?: number;
    acceptedDaysAgo?: number;
    viewCount?: number;
    lines: { name: string; quantity: number }[];
  }

  const quotes: SeedQuote[] = [
    {
      customerIndex: 0,
      number: 'DEV-2026-0038',
      title: 'Remplacement du siphon et du mitigeur — cuisine',
      summary: 'Fuite sous l’évier : remplacement du siphon, du mitigeur et vérification des raccordements.',
      status: 'ACCEPTE',
      sentDaysAgo: 18,
      acceptedDaysAgo: 16,
      viewCount: 3,
      lines: [
        { name: 'Siphon évier laiton', quantity: 1 },
        { name: 'Mitigeur évier chromé', quantity: 1 },
        { name: 'Flexible sanitaire inox 50 cm', quantity: 2 },
        { name: 'Main-d’œuvre plombier', quantity: 1.5 },
        { name: 'Déplacement et prise en charge', quantity: 1 },
      ],
    },
    {
      customerIndex: 1,
      number: 'DEV-2026-0039',
      title: 'Installation chauffe-eau 200 L',
      summary: 'Dépose de l’ancien ballon, fourniture et pose d’un chauffe-eau 200 L, mise en service.',
      status: 'ACCEPTE',
      sentDaysAgo: 12,
      acceptedDaysAgo: 9,
      viewCount: 2,
      lines: [
        { name: 'Chauffe-eau électrique 200 L', quantity: 1 },
        { name: 'Groupe de sécurité', quantity: 1 },
        { name: 'Installation chauffe-eau 200 L', quantity: 1 },
        { name: 'Déplacement et prise en charge', quantity: 1 },
      ],
    },
    {
      customerIndex: 2,
      number: 'DEV-2026-0041',
      title: 'Remplacement WC suspendu — local commercial',
      summary: 'Dépose du WC existant, pose d’un WC suspendu avec bâti-support, raccordements et essais.',
      status: 'CONSULTE',
      sentDaysAgo: 5,
      viewCount: 4,
      lines: [
        { name: 'Remplacement WC suspendu', quantity: 1 },
        { name: 'Main-d’œuvre plombier', quantity: 4 },
        { name: 'Déplacement et prise en charge', quantity: 1 },
      ],
    },
    {
      customerIndex: 3,
      number: 'DEV-2026-0042',
      title: 'Recherche de fuite et réparation',
      summary: 'Recherche de fuite en salle de bain, puis reprise du raccordement défectueux.',
      status: 'ENVOYE',
      sentDaysAgo: 3,
      viewCount: 0,
      lines: [
        { name: 'Recherche de fuite', quantity: 1 },
        { name: 'Main-d’œuvre plombier', quantity: 2 },
        { name: 'Déplacement et prise en charge', quantity: 1 },
      ],
    },
    {
      customerIndex: 1,
      number: 'DEV-2026-0043',
      title: 'Robinets thermostatiques — 6 radiateurs',
      summary: 'Remplacement de six robinets thermostatiques et purge du circuit.',
      status: 'BROUILLON',
      lines: [
        { name: 'Robinet thermostatique radiateur', quantity: 6 },
        { name: 'Main-d’œuvre plombier', quantity: 3 },
      ],
    },
  ];

  const { computeQuoteTotals } = await import('../src/lib/money');

  for (const seed of quotes) {
    const items = seed.lines.map((line) => {
      const entry = byName.get(line.name)!;
      return {
        priceBookItemId: entry.id,
        kind: entry.category === 'MAIN_OEUVRE' ? ('MAIN_OEUVRE' as const) : entry.category === 'MATERIAU' ? ('MATERIAU' as const) : ('SERVICE' as const),
        label: entry.name,
        unit: entry.unit,
        quantity: line.quantity,
        unitPriceCents: entry.salePriceCents,
        costPriceCents: entry.costPriceCents,
        vatRate: Number(entry.vatRate),
        discountRate: 0,
      };
    });

    const totals = computeQuoteTotals({
      lines: items.map((item) => ({
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        vatRate: item.vatRate,
        discountRate: 0,
        costPriceCents: item.costPriceCents,
      })),
    });

    const sentAt = seed.sentDaysAgo != null ? daysAgo(seed.sentDaysAgo) : null;
    const acceptedAt = seed.acceptedDaysAgo != null ? daysAgo(seed.acceptedDaysAgo) : null;

    await prisma.quote.create({
      data: {
        organizationId: organization.id,
        customerId: customers[seed.customerIndex]!.id,
        createdById: user.id,
        number: seed.number,
        title: seed.title,
        summary: seed.summary,
        status: seed.status,
        publicToken: token(),
        subtotalCents: totals.subtotalCents,
        netSubtotalCents: totals.netSubtotalCents,
        vatCents: totals.vatCents,
        totalCents: totals.totalCents,
        sentAt,
        firstViewedAt: seed.viewCount ? daysAgo((seed.sentDaysAgo ?? 1) - 1) : null,
        lastViewedAt: seed.viewCount ? daysAgo(Math.max(0, (seed.sentDaysAgo ?? 1) - 2)) : null,
        viewCount: seed.viewCount ?? 0,
        acceptedAt,
        respondedAt: acceptedAt,
        validUntil: sentAt ? new Date(sentAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
        createdAt: sentAt ?? new Date(),
        items: {
          create: items.map((item, index) => ({
            ...item,
            lineTotalCents: totals.lines[index]?.lineTotalCents ?? 0,
            vatCents: totals.lines[index]?.vatCents ?? 0,
            position: index,
          })),
        },
        events: {
          create: [
            { type: 'CREE', actor: `user:${user.id}`, createdAt: sentAt ?? new Date() },
            ...(sentAt ? [{ type: 'ENVOYE' as const, actor: `user:${user.id}`, createdAt: sentAt }] : []),
            ...(seed.viewCount ? [{ type: 'CONSULTE' as const, actor: 'client', createdAt: daysAgo((seed.sentDaysAgo ?? 2) - 1) }] : []),
            ...(acceptedAt ? [{ type: 'ACCEPTE' as const, actor: 'client', createdAt: acceptedAt }] : []),
          ],
        },
      },
    });
  }

  await prisma.documentCounter.create({
    data: { organizationId: organization.id, kind: 'QUOTE', year: new Date().getFullYear(), lastNumber: 43 },
  });

  await prisma.notification.createMany({
    data: [
      {
        organizationId: organization.id,
        type: 'DEVIS_ACCEPTE',
        title: 'Marie Delaunay a accepté le devis DEV-2026-0039.',
        href: '/app/devis',
        createdAt: daysAgo(9),
      },
      {
        organizationId: organization.id,
        type: 'DEVIS_CONSULTE',
        title: 'Boulangerie Lemoine a consulté le devis DEV-2026-0041.',
        href: '/app/devis',
        createdAt: daysAgo(4),
      },
      {
        organizationId: organization.id,
        type: 'NOUVEAU_PROSPECT',
        title: 'Nouvelle demande de devis : Julie Marchand',
        body: 'Remplacement chauffe-eau 200 L',
        href: '/app/prospects',
        createdAt: daysAgo(1),
      },
    ],
  });

  console.info('\n  Données de démonstration créées.');
  console.info(`  Entreprise : Plomberie Martin`);
  console.info(`  Connexion  : ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
