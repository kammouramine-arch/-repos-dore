import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FileText,
  Send,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { PageHeader } from '@/components/ui/page';
import { getTranslations } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { SignOutButton } from './sign-out';

export const metadata: Metadata = { title: 'Plus' };

const LINKS = [
  { href: '/app/relances', label: 'Relances', icon: Send, description: 'Devis en attente de réponse' },
  { href: '/app/catalogue', label: 'Catalogue de prix', icon: BookOpen, description: 'Vos articles et vos marges' },
  { href: '/app/assistant', label: 'Assistant', icon: Sparkles, description: 'Questions sur votre activité' },
  { href: '/app/analytique', label: 'Analytique', icon: BarChart3, description: 'Performance sur 90 jours' },
  { href: '/app/devis', label: 'Tous les devis', icon: FileText, description: 'Historique complet' },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings, description: 'Entreprise, équipe, automatisations' },
  { href: '/app/parametres/abonnement', label: 'Abonnement', icon: Wallet, description: 'Formule et facturation' },
];

export default async function MorePage() {
  const auth = await requireAuth();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.nav.more}
        description={`${auth.organization.organizationName} · ${ROLE_LABELS[auth.organization.role]}`}
      />

      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-surface"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface">
                  <link.icon className="h-[17px] w-[17px] text-ink-soft" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium text-ink">{link.label}</span>
                  <span className="block text-[12.5px] text-muted">{link.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <SignOutButton />
    </div>
  );
}
