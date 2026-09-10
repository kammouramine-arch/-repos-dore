import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LeadRequestForm } from './form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Demander un devis',
  robots: { index: false, follow: false },
};

export default async function PublicLeadFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const settings = await prisma.settings.findUnique({
    where: { publicLeadFormToken: token },
    include: { organization: { include: { businessProfile: { include: { logo: true } } } } },
  });

  if (!settings || !settings.publicLeadFormEnabled) notFound();

  const profile = settings.organization.businessProfile;
  const companyName = profile?.legalName ?? settings.organization.name;
  const brandColor = profile?.brandColor ?? '#2547e0';

  return (
    <div className="min-h-dvh bg-surface py-8 sm:py-14">
      <main id="contenu" className="mx-auto w-full max-w-[600px] px-4">
        <div className="overflow-hidden rounded-[18px] border border-line bg-canvas shadow-sm">
          <div className="h-1.5 w-full" style={{ background: brandColor }} aria-hidden />

          <header className="flex items-center gap-4 px-6 pb-5 pt-7 sm:px-8">
            {profile?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/public/logo/${profile.logo.id}`}
                alt={companyName}
                className="h-11 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[15px] font-semibold text-white"
                style={{ background: brandColor }}
                aria-hidden
              >
                {companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-ink">{companyName}</p>
              {profile?.city ? <p className="text-[13px] text-muted">{profile.city}</p> : null}
            </div>
          </header>

          <div className="border-t border-line px-6 py-7 sm:px-8">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] text-ink">
              Demander un devis
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
              Décrivez votre besoin en quelques lignes. Vous recevrez une réponse rapidement.
            </p>

            <div className="mt-6">
              <LeadRequestForm token={token} brandColor={brandColor} companyName={companyName} />
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] text-subtle">
          Vos informations sont transmises uniquement à {companyName}.
        </p>
      </main>
    </div>
  );
}
