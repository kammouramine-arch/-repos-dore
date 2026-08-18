import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { createLead, convertLeadToCustomer, receivePublicLead } from '@/server/services/leadService';
import { importPriceBookCsv, loadCatalog, parseCsv } from '@/server/services/priceBookService';
import { generateQuoteDraft } from '@/server/services/aiQuoteService';
import { createQuote, registerClientDecision } from '@/server/services/quoteService';
import { sendQuote } from '@/server/services/quoteSendService';
import { buildQuotePdf } from '@/server/services/quotePdfService';
import {
  draftFollowUpMessage,
  processDueFollowUps,
  revenueToRecover,
  sendFollowUp,
} from '@/server/services/followUpService';
import { getDashboardMetrics } from '@/server/services/dashboardService';
import { globalSearch } from '@/server/services/searchService';

let org: Awaited<ReturnType<typeof createTestOrganization>>;

const CSV = `reference;nom;description;categorie;unite;prix_achat;prix_vente;tva;mots_cles
PM-001;Main-d'oeuvre plombier;Heure d'intervention;MAIN_OEUVRE;h;22,00;55,00;10;main,oeuvre,plombier
PM-003;Siphon evier laiton;Siphon laiton pour evier;MATERIAU;u;14,00;32,00;10;siphon,evier
PM-006;Chauffe-eau 200 L;Ballon 200 litres;MATERIAU;u;480,00;790,00;10;chauffe,eau,ballon
;Ligne invalide sans prix;;MATERIAU;u;10,00;;20;`;

beforeAll(async () => {
  org = await createTestOrganization('Parcours Complet');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id, org.user.id);
  await prisma.$disconnect();
});

describe('parcours complet prospect → devis → acceptation', () => {
  it('analyse un CSV en gérant les séparateurs et les lignes invalides', () => {
    const rows = parseCsv(CSV);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.nom).toBe("Main-d'oeuvre plombier");
  });

  it('importe le catalogue de prix', async () => {
    const result = await importPriceBookCsv(org.organization.id, org.user.id, CSV);
    expect(result.created).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatch(/ignorée/i);

    const catalog = await loadCatalog(org.organization.id);
    expect(catalog).toHaveLength(3);
    expect(catalog.find((item) => item.reference === 'PM-003')?.salePriceCents).toBe(3200);
  });

  it('met à jour un article existant lors d’un second import', async () => {
    const result = await importPriceBookCsv(
      org.organization.id,
      org.user.id,
      `reference;nom;categorie;unite;prix_achat;prix_vente;tva\nPM-003;Siphon evier laiton;MATERIAU;u;15,00;36,00;10`,
    );
    expect(result.updated).toBe(1);
    const catalog = await loadCatalog(org.organization.id);
    expect(catalog.find((item) => item.reference === 'PM-003')?.salePriceCents).toBe(3600);
  });

  it('reçoit une demande depuis le formulaire public', async () => {
    const settings = await prisma.settings.findUnique({
      where: { organizationId: org.organization.id },
    });

    const result = await receivePublicLead(settings!.publicLeadFormToken, {
      contactName: 'Julie Marchand',
      email: 'julie@example.fr',
      phone: '06 45 67 89 01',
      city: 'Lyon',
      description: 'Fuite sous l’évier de la cuisine, le siphon goutte en permanence.',
    });

    expect(result.leadId).toBeTruthy();
    const lead = await prisma.lead.findUnique({ where: { id: result.leadId } });
    expect(lead?.source).toBe('FORMULAIRE_WEB');
  });

  it('convertit un prospect en client avec un chantier', async () => {
    const lead = await createLead(org.organization.id, org.user.id, {
      contactName: 'Paul Roussel',
      title: 'Remplacement du siphon',
      email: 'paul@example.fr',
      description: 'Fuite sous évier',
    });

    const conversion = await convertLeadToCustomer(org.organization.id, org.user.id, lead.id);
    expect(conversion.customerId).toBeTruthy();
    expect(conversion.jobId).toBeTruthy();

    const customer = await prisma.customer.findUnique({ where: { id: conversion.customerId } });
    expect(customer?.email).toBe('paul@example.fr');

    // Une seconde conversion ne duplique pas le client.
    const again = await convertLeadToCustomer(org.organization.id, org.user.id, lead.id);
    expect(again.alreadyLinked).toBe(true);
  });

  it('prépare un devis en mode local à partir du catalogue', async () => {
    const draft = await generateQuoteDraft({
      organizationId: org.organization.id,
      userId: org.user.id,
      description:
        "Le client a une fuite sous l'évier. Il faut remplacer le siphon, vérifier les raccordements et prévoir environ une heure de main-d'oeuvre.",
    });

    expect(draft.degraded).toBe(true);
    expect(draft.lines.length).toBeGreaterThan(0);
    expect(draft.lines.some((line) => line.fromCatalog)).toBe(true);
    expect(draft.totals.totalCents).toBeGreaterThan(0);

    // Le prix appliqué est celui du catalogue de l'entreprise.
    const siphon = draft.lines.find((line) => /siphon/i.test(line.label));
    expect(siphon?.unitPriceCents).toBe(3600);

    const usage = await prisma.usageRecord.findFirst({
      where: { organizationId: org.organization.id, metric: 'AI_GENERATION' },
    });
    expect(usage?.count).toBe(1);
  });

  it('envoie le devis, génère le PDF et planifie les relances', async () => {
    const customer = await prisma.customer.findFirst({
      where: { organizationId: org.organization.id, email: 'paul@example.fr' },
    });

    const quote = await createQuote(org.organization.id, org.user.id, {
      customerId: customer!.id,
      title: 'Remplacement du siphon sous évier',
      items: [
        { kind: 'MATERIAU', label: 'Siphon évier laiton', unit: 'u', quantity: 1, unitPriceCents: 3600, vatRate: 10, discountRate: 0 },
        { kind: 'MAIN_OEUVRE', label: 'Main-d’œuvre plombier', unit: 'h', quantity: 1, unitPriceCents: 5500, vatRate: 10, discountRate: 0 },
      ],
    });

    const pdf = await buildQuotePdf(quote.id);
    expect(pdf.bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(pdf.bytes.subarray(0, 4)).toString()).toBe('%PDF');
    expect(pdf.fileName).toBe(`Devis-${quote.number}.pdf`);

    const result = await sendQuote({
      organizationId: org.organization.id,
      userId: org.user.id,
      quoteId: quote.id,
    });

    expect(result.quote.status).toBe('ENVOYE');
    expect(result.quote.sentAt).not.toBeNull();
    expect(result.publicUrl).toContain('/devis/');

    const followUps = await prisma.followUp.findMany({ where: { quoteId: quote.id } });
    expect(followUps.length).toBeGreaterThan(0);
    expect(followUps.every((item) => item.status === 'PLANIFIEE')).toBe(true);
  });

  it('refuse d’envoyer un devis sans email client', async () => {
    const customer = await prisma.customer.create({
      data: { organizationId: org.organization.id, lastName: 'SansEmail' },
    });
    const quote = await createQuote(org.organization.id, org.user.id, {
      customerId: customer.id,
      title: 'Devis sans destinataire',
      items: [{ kind: 'SERVICE', label: 'Prestation', unit: 'u', quantity: 1, unitPriceCents: 10_000, vatRate: 20, discountRate: 0 }],
    });

    await expect(
      sendQuote({ organizationId: org.organization.id, userId: org.user.id, quoteId: quote.id }),
    ).rejects.toThrowError(/adresse email/i);
  });

  it('calcule le chiffre d’affaires à récupérer', async () => {
    const recovery = await revenueToRecover(org.organization.id);
    expect(recovery.quoteCount).toBeGreaterThan(0);
    expect(recovery.totalCents).toBeGreaterThan(0);
    expect(recovery.quotes[0]?.customerName).toBeTruthy();
  });

  it('rédige puis envoie une relance', async () => {
    const quote = await prisma.quote.findFirst({
      where: { organizationId: org.organization.id, status: 'ENVOYE' },
    });

    const draft = await draftFollowUpMessage(org.organization.id, quote!.id, 1);
    expect(draft.degraded).toBe(true);
    expect(draft.message).toContain(quote!.number);

    const sent = await sendFollowUp({
      organizationId: org.organization.id,
      userId: org.user.id,
      quoteId: quote!.id,
      subject: draft.objet,
      body: draft.message,
    });
    expect(sent.status).toBe('ENVOYEE');

    const usage = await prisma.usageRecord.findFirst({
      where: { organizationId: org.organization.id, metric: 'FOLLOWUP_SENT' },
    });
    expect(usage?.count).toBe(1);
  });

  it('transforme les relances échues en suggestions à valider', async () => {
    await prisma.followUp.updateMany({
      where: { organizationId: org.organization.id, status: 'PLANIFIEE' },
      data: { scheduledFor: new Date(Date.now() - 60_000) },
    });

    const result = await processDueFollowUps();
    expect(result.processed).toBeGreaterThan(0);
    expect(result.suggested).toBeGreaterThan(0);
    expect(result.sent).toBe(0); // rien n'est envoyé sans validation
  });

  it('annule les relances quand le client accepte', async () => {
    const quote = await prisma.quote.findFirst({
      where: { organizationId: org.organization.id, status: { in: ['ENVOYE', 'CONSULTE'] } },
    });

    await registerClientDecision(quote!.publicToken, 'ACCEPTE', { signatureName: 'Paul Roussel' });

    const followUps = await prisma.followUp.findMany({
      where: { quoteId: quote!.id, status: { in: ['SUGGEREE', 'PLANIFIEE'] } },
    });
    expect(followUps).toHaveLength(0);
  });

  it('remonte les indicateurs du tableau de bord', async () => {
    const metrics = await getDashboardMetrics(org.organization.id, 30);
    expect(metrics.quotesSent).toBeGreaterThan(0);
    expect(metrics.quotesAccepted).toBeGreaterThan(0);
    expect(metrics.acceptanceRate).toBeGreaterThan(0);
    expect(metrics.series.length).toBeGreaterThan(0);
    expect(metrics.funnel).toHaveLength(4);
  });

  it('limite la recherche globale à l’organisation', async () => {
    const results = await globalSearch(org.organization.id, 'Roussel');
    expect(results.length).toBeGreaterThan(0);

    const other = await createTestOrganization('Concurrent');
    const isolated = await globalSearch(other.organization.id, 'Roussel');
    expect(isolated).toHaveLength(0);
    await cleanupOrganization(other.organization.id, other.user.id);
  });
});
