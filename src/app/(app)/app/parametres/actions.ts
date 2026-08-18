'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { businessProfileSchema } from '@/server/validation';
import { toUserMessage } from '@/lib/errors';
import { recordAudit } from '@/server/services/auditService';
import { completeOnboarding } from '@/server/services/organizationService';
import { trackEvent } from '@/server/services/analyticsService';
import { eurosToCents } from '@/lib/money';

export interface SettingsState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}

function collect(formData: FormData) {
  const value = (key: string) => {
    const raw = formData.get(key);
    return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
  };

  return {
    legalName: value('legalName') ?? '',
    ownerName: value('ownerName') ?? null,
    email: value('email') ?? null,
    phone: value('phone') ?? null,
    website: value('website') ?? null,
    addressLine1: value('addressLine1') ?? null,
    postalCode: value('postalCode') ?? null,
    city: value('city') ?? null,
    country: value('country') ?? 'FR',
    siret: value('siret') ?? null,
    vatNumber: value('vatNumber') ?? null,
    insurance: value('insurance') ?? null,
    trade: value('trade') ?? 'AUTRE',
    vatStatus: value('vatStatus') ?? 'ASSUJETTI',
    defaultVatRate: Number(value('defaultVatRate') ?? 20),
    defaultHourlyCents: eurosToCents(value('defaultHourly') ?? '45'),
    paymentTerms: value('paymentTerms') ?? null,
    quoteValidityDays: Number(value('quoteValidityDays') ?? 30),
    quoteTerms: value('quoteTerms') ?? null,
    quoteFooter: value('quoteFooter') ?? null,
    brandColor: value('brandColor') ?? '#2547E0',
  };
}

/** Enregistre le profil d'entreprise (onboarding et paramètres partagent ce point d'entrée). */
export async function saveBusinessProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = businessProfileSchema.safeParse(collect(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'global';
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return { error: 'Vérifiez les informations saisies.', fieldErrors };
  }

  try {
    const auth = await requirePermission('settings:write');
    const organizationId = auth.organization.organizationId;
    const logoFileId = formData.get('logoFileId');

    await prisma.businessProfile.update({
      where: { organizationId },
      data: {
        ...parsed.data,
        logoFileId: typeof logoFileId === 'string' && logoFileId ? logoFileId : undefined,
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { name: parsed.data.legalName },
    });

    await recordAudit({ action: 'settings.updated', organizationId, userId: auth.user.id });
    revalidatePath('/app/parametres');
    return { success: 'Informations enregistrées.' };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

/** Termine l'onboarding : profil enregistré puis marqueur posé. */
export async function completeOnboardingAction(
  prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const result = await saveBusinessProfile(prev, formData);
  if (result.error) return result;

  try {
    const auth = await requirePermission('settings:write');
    await completeOnboarding(auth.organization.organizationId);
    await trackEvent('onboarding_completed', {
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
    });
    return { success: 'Bienvenue sur DEVISIA.' };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

const notificationsSchema = z.object({
  notifyOnQuoteViewed: z.boolean(),
  notifyOnQuoteAccepted: z.boolean(),
  notifyOnQuoteRefused: z.boolean(),
  notifyOnNewLead: z.boolean(),
  notifyByEmail: z.boolean(),
  followUpsEnabled: z.boolean(),
  publicLeadFormEnabled: z.boolean(),
  aiSignature: z.string().max(200).nullish(),
});

export async function saveNotificationSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = notificationsSchema.safeParse({
    notifyOnQuoteViewed: formData.get('notifyOnQuoteViewed') === 'on',
    notifyOnQuoteAccepted: formData.get('notifyOnQuoteAccepted') === 'on',
    notifyOnQuoteRefused: formData.get('notifyOnQuoteRefused') === 'on',
    notifyOnNewLead: formData.get('notifyOnNewLead') === 'on',
    notifyByEmail: formData.get('notifyByEmail') === 'on',
    followUpsEnabled: formData.get('followUpsEnabled') === 'on',
    publicLeadFormEnabled: formData.get('publicLeadFormEnabled') === 'on',
    aiSignature: (formData.get('aiSignature') as string) || null,
  });
  if (!parsed.success) return { error: 'Paramètres invalides.' };

  try {
    const auth = await requirePermission('settings:write');
    await prisma.settings.update({
      where: { organizationId: auth.organization.organizationId },
      data: parsed.data,
    });
    revalidatePath('/app/parametres');
    return { success: 'Préférences enregistrées.' };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

/** Active/désactive une automatisation de relance et ajuste son délai. */
export async function updateAutomation(
  automationId: string,
  data: { isActive?: boolean; delayHours?: number; requireApproval?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requirePermission('automation:write');
    const result = await prisma.automation.updateMany({
      where: { id: automationId, organizationId: auth.organization.organizationId },
      data,
    });
    if (result.count === 0) return { ok: false, error: 'Automatisation introuvable.' };

    await recordAudit({
      action: 'automation.updated',
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
      entityId: automationId,
      metadata: data,
    });
    revalidatePath('/app/parametres/automatisations');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

const localeSchema = z.enum(['fr', 'en']);

export async function setLocale(locale: string): Promise<void> {
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) return;
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.set('devisia_locale', parsed.data, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/app');
}
