import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { loadBusinessProfileValue } from '@/server/profile';
import { BusinessProfileForm } from '@/components/app/business-form';
import { completeOnboardingAction } from '../parametres/actions';

export const metadata: Metadata = { title: 'Bienvenue' };

export default async function OnboardingPage() {
  const auth = await requireAuth();
  const organizationId = auth.organization.organizationId;

  const profile = await prisma.businessProfile.findUnique({
    where: { organizationId },
    select: { onboardingCompleted: true },
  });
  if (profile?.onboardingCompleted) redirect('/app');

  const value = await loadBusinessProfileValue(organizationId);

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
          Configuration
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.028em] text-ink sm:text-[30px]">
          Bienvenue sur DEVISIA
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Ces informations apparaîtront sur vos devis. Vous pourrez les modifier à tout moment —
          l’essentiel est de pouvoir envoyer votre premier devis dès aujourd’hui.
        </p>
      </header>

      <BusinessProfileForm
        value={value}
        action={completeOnboardingAction}
        submitLabel="Terminer et créer mon premier devis"
        compact
      />
    </div>
  );
}
