import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bell,
  Building2,
  ChevronRight,
  Globe,
  Repeat,
  ShieldCheck,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import { PLANS } from '@/lib/billing/plans';
import { PageHeader } from '@/components/ui/page';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocaleSwitcher } from './locale-switcher';
import { getLocale, getDictionary } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Paramètres' };

const SECTIONS = [
  {
    href: '/app/parametres/entreprise',
    label: 'Entreprise et identité',
    description: 'Logo, coordonnées, SIRET, TVA, conditions et couleur de marque',
    icon: Building2,
  },
  {
    href: '/app/parametres/automatisations',
    label: 'Automatisations et notifications',
    description: 'Délais de relance, alertes, signature des messages',
    icon: Repeat,
  },
  {
    href: '/app/parametres/prospects',
    label: 'Formulaire de demande de devis',
    description: 'Lien public à intégrer sur votre site',
    icon: Workflow,
  },
  {
    href: '/app/parametres/equipe',
    label: 'Équipe',
    description: 'Membres, rôles et invitations',
    icon: Users,
  },
  {
    href: '/app/parametres/abonnement',
    label: 'Abonnement',
    description: 'Formule, consommation et facturation',
    icon: Wallet,
  },
  {
    href: '/app/catalogue',
    label: 'Catalogue de prix',
    description: 'Articles, prix d’achat, prix de vente et marges',
    icon: ShieldCheck,
  },
];

export default async function SettingsPage() {
  const auth = await requireAuth();
  const [subscription, locale] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: auth.organization.organizationId } }),
    getLocale(),
  ]);
  const t = getDictionary(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settings.title}
        description={`${auth.organization.organizationName} · vous êtes ${ROLE_LABELS[auth.organization.role].toLowerCase()}.`}
        actions={
          subscription ? (
            <Badge tone={subscription.status === 'active' ? 'success' : 'accent'}>
              {PLANS[subscription.plan].name}
              {subscription.status === 'trialing' ? ' — essai' : ''}
            </Badge>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-surface/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface">
                  <section.icon className="h-[17px] w-[17px] text-ink-soft" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium text-ink">{section.label}</span>
                  <span className="block text-[12.5px] text-muted">{section.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="h-[18px] w-[18px] text-subtle" aria-hidden />
            <div>
              <p className="text-[14px] font-medium text-ink">{t.settings.language}</p>
              <p className="text-[12.5px] text-muted">{t.settings.languageHint}</p>
            </div>
          </div>
          <LocaleSwitcher current={locale} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-[18px] w-[18px] shrink-0 text-subtle" aria-hidden />
          <div>
            <p className="text-[14px] font-medium text-ink">Sécurité du compte</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Vos sessions sont révoquées automatiquement lors d’un changement de mot de passe. Pour
              changer votre mot de passe, utilisez le lien « Mot de passe oublié » depuis l’écran de
              connexion.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
