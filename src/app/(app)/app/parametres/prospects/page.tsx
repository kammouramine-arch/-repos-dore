import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page';
import { requirePermission } from '@/lib/auth/page-session';
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
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Formulaire de demande de devis"
        description="Partagez ce lien ou intégrez-le à votre site : chaque demande crée un prospect dans DEVISERA et vous notifie immédiatement."
      />

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
