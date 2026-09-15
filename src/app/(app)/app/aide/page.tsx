import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpenText, ExternalLink, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { requireAuth } from '@/lib/auth/page-session';
import { PageHeader } from '@/components/ui/page';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTranslations } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Aide' };

const SUPPORT_EMAIL = 'contact@devisera.fr';

/** Aide et contact : la même adresse que « Nous contacter » dans l'application iOS. */
export default async function HelpPage() {
  const auth = await requireAuth();
  const { t } = await getTranslations();
  const subject = encodeURIComponent('DEVISERA');
  const body = encodeURIComponent(`\n\n—\nDEVISERA web · ${auth.organization.organizationName} · ${auth.user.id}`);

  const cards = [
    {
      icon: Mail,
      title: t.help.contactTitle,
      body: t.help.contactBody,
      action: (
        <Button asChild>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
            <Mail className="h-4 w-4" aria-hidden />
            {SUPPORT_EMAIL}
          </a>
        </Button>
      ),
    },
    {
      icon: BookOpenText,
      title: t.help.guideTitle,
      body: t.help.guideBody,
      action: (
        <Button asChild variant="secondary">
          <Link href="/assistance" target="_blank" rel="noreferrer">
            {t.help.openGuide}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      ),
    },
    {
      icon: Smartphone,
      title: t.help.mobileTitle,
      body: t.help.mobileBody,
      action: null,
    },
    {
      icon: ShieldCheck,
      title: t.help.privacyTitle,
      body: t.help.privacyBody,
      action: (
        <Button asChild variant="secondary">
          <Link href="/confidentialite" target="_blank" rel="noreferrer">
            {t.help.openPrivacy}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t.help.title} description={t.help.subtitle} />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex h-full flex-col">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-soft">
                <card.icon className="h-5 w-5 text-accent" aria-hidden />
              </div>
              <h2 className="mt-4 text-[15px] font-semibold text-ink">{card.title}</h2>
              <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{card.body}</p>
              {card.action ? <div className="mt-4">{card.action}</div> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
