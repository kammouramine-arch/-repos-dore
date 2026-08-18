import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/env';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { CopyField } from './copy-field';

export const metadata: Metadata = { title: 'Formulaire de demande' };

export default async function PublicFormPage() {
  const auth = await requirePermission('settings:read');
  const settings = await prisma.settings.findUnique({
    where: { organizationId: auth.organization.organizationId },
  });

  const formUrl = settings ? appUrl(`/demande/${settings.publicLeadFormToken}`) : '';
  const embedCode = `<iframe src="${formUrl}" width="100%" height="720" style="border:0;border-radius:14px" title="Demande de devis"></iframe>`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/parametres"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Paramètres
      </Link>

      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">
          Formulaire de demande de devis
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Partagez ce lien ou intégrez-le à votre site : chaque demande crée un prospect dans DEVISIA
          et vous notifie immédiatement.
        </p>
      </header>

      {!settings?.publicLeadFormEnabled ? (
        <Alert tone="warning">
          Le formulaire est désactivé. Activez-le depuis{' '}
          <Link href="/app/parametres/automatisations" className="underline">
            Automatisations et notifications
          </Link>
          .
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lien public</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-1">
          <CopyField label="Adresse du formulaire" value={formUrl} />
          <CopyField label="Code d’intégration (iframe)" value={embedCode} multiline />
          <p className="text-[12.5px] leading-relaxed text-subtle">
            Le formulaire est limité en nombre d’envois par heure et par adresse afin d’éviter les
            abus. Aucune donnée de votre entreprise n’y est exposée.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
