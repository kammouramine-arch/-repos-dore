import 'server-only';
import type { LeadSourceType, LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notFound } from '@/lib/errors';
import { getEmailProvider, newLeadEmail } from '@/lib/email';
import { toLeadDTO } from '../dto';
import { notify } from './notificationService';
import { recordAudit } from './auditService';
import { trackEvent } from './analyticsService';

export const LEAD_PIPELINE: LeadStatus[] = [
  'NOUVEAU',
  'CONTACTE',
  'QUALIFIE',
  'DEVIS_ENVOYE',
  'RELANCE',
  'GAGNE',
  'PERDU',
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NOUVEAU: 'Nouveau',
  CONTACTE: 'Contacté',
  QUALIFIE: 'Qualifié',
  DEVIS_ENVOYE: 'Devis envoyé',
  RELANCE: 'Relance',
  GAGNE: 'Gagné',
  PERDU: 'Perdu',
};

export const LEAD_SOURCE_LABELS: Record<LeadSourceType, string> = {
  MANUEL: 'Saisie manuelle',
  FORMULAIRE_WEB: 'Formulaire web',
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  TELEPHONE: 'Téléphone',
  STANDARD_IA: 'Standard IA',
  IMPORT: 'Import',
  AUTRE: 'Autre',
};

export interface LeadWriteInput {
  contactName: string;
  title: string;
  description?: string | null;
  jobType?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  status?: LeadStatus;
  source?: LeadSourceType;
  sourceDetail?: string | null;
  estimatedCents?: number | null;
  customerId?: string | null;
  nextFollowUpAt?: Date | null;
  lostReason?: string | null;
}

export async function listLeads(organizationId: string, options: { status?: LeadStatus; search?: string } = {}) {
  const where: Prisma.LeadWhereInput = {
    organizationId,
    deletedAt: null,
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          OR: [
            { contactName: { contains: options.search, mode: 'insensitive' } },
            { title: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
            { phone: { contains: options.search, mode: 'insensitive' } },
            { city: { contains: options.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ lastActivityAt: 'desc' }],
    take: 200,
    include: { quotes: { where: { deletedAt: null }, select: { id: true, totalCents: true, status: true } } },
  });
  return leads.map((lead) => ({
    ...toLeadDTO(lead),
    quoteCount: lead.quotes.length,
    quotedCents: lead.quotes.reduce((acc, quote) => acc + quote.totalCents, 0),
  }));
}

export async function getLead(organizationId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },
    include: {
      customer: true,
      quotes: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      files: { where: { deletedAt: null } },
    },
  });
  if (!lead) throw notFound('Prospect introuvable.');
  return lead;
}

export async function createLead(organizationId: string, userId: string | null, input: LeadWriteInput) {
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      contactName: input.contactName,
      title: input.title,
      description: input.description || null,
      jobType: input.jobType || null,
      email: input.email?.toLowerCase() || null,
      phone: input.phone || null,
      city: input.city || null,
      postalCode: input.postalCode || null,
      addressLine1: input.addressLine1 || null,
      status: input.status ?? 'NOUVEAU',
      source: input.source ?? 'MANUEL',
      sourceDetail: input.sourceDetail || null,
      estimatedCents: input.estimatedCents ?? null,
      customerId: input.customerId || null,
      nextFollowUpAt: input.nextFollowUpAt ?? null,
    },
  });

  await notify({
    organizationId,
    type: 'NOUVEAU_PROSPECT',
    title: `Nouveau prospect : ${lead.contactName}`,
    body: lead.title,
    href: `/app/prospects/${lead.id}`,
  });
  await trackEvent('lead_created', {
    organizationId,
    userId,
    properties: { source: lead.source },
  });
  await recordAudit({
    action: 'lead.created',
    organizationId,
    userId,
    entityType: 'lead',
    entityId: lead.id,
  });

  return toLeadDTO(lead);
}

export async function updateLead(
  organizationId: string,
  userId: string,
  leadId: string,
  input: Partial<LeadWriteInput>,
) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw notFound('Prospect introuvable.');

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      contactName: input.contactName,
      title: input.title,
      description: input.description === undefined ? undefined : input.description || null,
      jobType: input.jobType === undefined ? undefined : input.jobType || null,
      email: input.email === undefined ? undefined : input.email?.toLowerCase() || null,
      phone: input.phone === undefined ? undefined : input.phone || null,
      city: input.city === undefined ? undefined : input.city || null,
      postalCode: input.postalCode === undefined ? undefined : input.postalCode || null,
      addressLine1: input.addressLine1 === undefined ? undefined : input.addressLine1 || null,
      status: input.status,
      source: input.source,
      estimatedCents: input.estimatedCents,
      customerId: input.customerId === undefined ? undefined : input.customerId || null,
      nextFollowUpAt: input.nextFollowUpAt,
      lostReason: input.lostReason === undefined ? undefined : input.lostReason || null,
      lastActivityAt: new Date(),
    },
  });
  await recordAudit({
    action: 'lead.updated',
    organizationId,
    userId,
    entityType: 'lead',
    entityId: leadId,
    metadata: input.status ? { status: input.status } : undefined,
  });
  return toLeadDTO(lead);
}

/** Transforme un prospect en client (+ chantier), en évitant les doublons. */
export async function convertLeadToCustomer(
  organizationId: string,
  userId: string,
  leadId: string,
  options: { createJob?: boolean } = {},
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },
  });
  if (!lead) throw notFound('Prospect introuvable.');
  if (lead.customerId) {
    return { customerId: lead.customerId, jobId: null, alreadyLinked: true };
  }

  const existing = lead.email
    ? await prisma.customer.findFirst({
        where: { organizationId, email: lead.email, deletedAt: null },
        select: { id: true },
      })
    : null;

  const [firstName, ...rest] = lead.contactName.trim().split(/\s+/);
  const customerId =
    existing?.id ??
    (
      await prisma.customer.create({
        data: {
          organizationId,
          firstName: firstName ?? lead.contactName,
          lastName: rest.join(' ') || null,
          email: lead.email,
          phone: lead.phone,
          addressLine1: lead.addressLine1,
          city: lead.city,
          postalCode: lead.postalCode,
          source: lead.source,
        },
      })
    ).id;

  let jobId: string | null = null;
  if (options.createJob !== false) {
    const job = await prisma.job.create({
      data: {
        organizationId,
        customerId,
        leadId: lead.id,
        title: lead.title,
        description: lead.description,
        addressLine1: lead.addressLine1,
        city: lead.city,
        postalCode: lead.postalCode,
      },
    });
    jobId = job.id;
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { customerId, status: lead.status === 'NOUVEAU' ? 'QUALIFIE' : lead.status, lastActivityAt: new Date() },
  });

  await recordAudit({
    action: 'lead.converted',
    organizationId,
    userId,
    entityType: 'lead',
    entityId: lead.id,
    metadata: { customerId, jobId },
  });

  return { customerId, jobId, alreadyLinked: false };
}

/** Réception d'une demande depuis le formulaire public d'une entreprise. */
export async function receivePublicLead(
  publicToken: string,
  input: {
    contactName: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    postalCode?: string | null;
    addressLine1?: string | null;
    description: string;
    fileIds?: string[];
  },
) {
  const settings = await prisma.settings.findUnique({
    where: { publicLeadFormToken: publicToken },
    include: { organization: { include: { businessProfile: true } } },
  });
  if (!settings || !settings.publicLeadFormEnabled) throw notFound('Formulaire introuvable.');

  const lead = await prisma.lead.create({
    data: {
      organizationId: settings.organizationId,
      contactName: input.contactName.slice(0, 120),
      title: input.description.slice(0, 90),
      description: input.description.slice(0, 4000),
      email: input.email?.toLowerCase().slice(0, 160) || null,
      phone: input.phone?.slice(0, 40) || null,
      city: input.city?.slice(0, 120) || null,
      postalCode: input.postalCode?.slice(0, 12) || null,
      addressLine1: input.addressLine1?.slice(0, 200) || null,
      source: 'FORMULAIRE_WEB',
      sourceDetail: 'Formulaire public DEVISIA',
    },
  });

  if (input.fileIds?.length) {
    await prisma.file.updateMany({
      where: { id: { in: input.fileIds }, organizationId: settings.organizationId },
      data: { leadId: lead.id },
    });
  }

  await notify({
    organizationId: settings.organizationId,
    type: 'NOUVEAU_PROSPECT',
    title: `Nouvelle demande de devis : ${lead.contactName}`,
    body: lead.title,
    href: `/app/prospects/${lead.id}`,
  });

  if (settings.notifyOnNewLead && settings.organization.businessProfile?.email) {
    await getEmailProvider()
      .send({
        to: settings.organization.businessProfile.email,
        ...newLeadEmail({
          contactName: lead.contactName,
          title: lead.title,
          phone: lead.phone,
          email: lead.email,
          description: lead.description,
        }),
      })
      .catch((error) => console.error('[lead] notification email impossible', error));
  }

  await trackEvent('lead_created', {
    organizationId: settings.organizationId,
    properties: { source: 'FORMULAIRE_WEB' },
  });

  return { leadId: lead.id, organizationName: settings.organization.businessProfile?.legalName ?? settings.organization.name };
}
