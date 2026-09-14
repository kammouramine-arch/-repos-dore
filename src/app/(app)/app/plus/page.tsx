import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronRight,
  Database,
  FileText,
  LifeBuoy,
  MessageSquareText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { requireAuth } from '@/lib/auth/page-session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import { PLANS } from '@/lib/billing/plans';
import { getTranslations } from '@/lib/i18n';
import { Avatar } from '@/components/app/shell';
import { SignOutButton } from './sign-out';

export const metadata: Metadata = { title: 'Mon espace' };

/**
 * « Mon espace » sur le web mobile : la même hiérarchie que sur iPhone —
 * identité sur la surface de marque, puis les groupes Compte, Abonnement,
 * Outils, Assistance, Confidentialité, Légal, et la déconnexion.
 */
export default async function MorePage() {
  const auth = await requireAuth();
  const { t } = await getTranslations();
  const subscription = await prisma.subscription.findUnique({ where: { organizationId: auth.organization.organizationId }, select: { plan: true } });
  const name = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || auth.user.email;

  const groups: { title: string; items: { href: string; label: string; hint: string; icon: React.ElementType; external?: boolean }[] }[] = [
    {
      title: 'Compte',
      items: [
        { href: '/app/parametres/profil', label: t.settings.profile, hint: t.settings.profileHint, icon: User },
        { href: '/app/parametres/entreprise', label: t.settings.business, hint: t.settings.businessHint, icon: Building2 },
      ],
    },
    {
      title: t.nav.subscription,
      items: [{ href: '/app/parametres/abonnement', label: t.settings.billing, hint: t.settings.billingHint, icon: Wallet }],
    },
    {
      title: t.nav.tools,
      items: [
        { href: '/app/relances', label: t.nav.followUps, hint: 'Devis en attente de réponse', icon: Send },
        { href: '/app/prospects', label: t.nav.leads, hint: 'Demandes, relances, chantiers gagnés', icon: MessageSquareText },
        { href: '/app/catalogue', label: t.nav.priceBook, hint: 'Vos prestations et vos tarifs', icon: BookOpen },
        { href: '/app/analytique', label: t.nav.analytics, hint: 'Chiffre d’affaires et suivi des devis', icon: BarChart3 },
        { href: '/app/assistant', label: t.nav.assistant, hint: 'Questions sur votre activité', icon: Sparkles },
        { href: '/app/parametres/equipe', label: t.nav.team, hint: t.settings.teamHint, icon: UsersRound },
        { href: '/app/parametres', label: t.nav.settings, hint: t.settings.hubSubtitle, icon: Settings },
      ],
    },
    {
      title: t.nav.help,
      items: [{ href: '/app/aide', label: t.help.title, hint: t.help.subtitle, icon: LifeBuoy }],
    },
    {
      title: 'Confidentialité et données',
      items: [
        { href: '/app/parametres/confidentialite', label: t.settings.privacy, hint: t.settings.privacyHint, icon: Sparkles },
        { href: '/app/parametres/donnees', label: t.settings.data, hint: t.settings.dataHint, icon: Database },
      ],
    },
    {
      title: 'Informations légales',
      items: [
        { href: '/confidentialite', label: 'Politique de confidentialité', hint: '', icon: ShieldCheck, external: true },
        { href: '/conditions', label: 'Conditions d’utilisation', hint: '', icon: FileText, external: true },
      ],
    },
  ];

  return (
    <div>
      <section className="brand-surface relative -mx-4 -mt-5 rounded-b-[28px] px-4 pb-16 pt-8 text-center text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-7 lg:px-8">
        <div className="mx-auto flex flex-col items-center">
          <span className="rounded-full ring-4 ring-white/25">
            <Avatar name={name} url={null} size="lg" />
          </span>
          <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80">{t.nav.workspace}</p>
          <h1 className="mt-1 text-[24px] font-bold tracking-[-0.03em]">{name}</h1>
          <p className="mt-1 text-[13.5px] text-white/85">
            {auth.organization.organizationName} · {ROLE_LABELS[auth.organization.role]}
            {subscription ? ` · ${PLANS[subscription.plan].name}` : ''}
          </p>
        </div>
      </section>

      <div className="relative -mt-8 space-y-5">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{group.title}</h2>
            <ul className="overflow-hidden rounded-[16px] border border-line bg-canvas shadow-card">
              {group.items.map((item) => (
                <li key={item.href} className="border-b border-line last:border-b-0">
                  <Link
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noreferrer' : undefined}
                    className="pressable flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-surface"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                      <item.icon className="h-[17px] w-[17px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium text-ink">{item.label}</span>
                      {item.hint ? <span className="block truncate text-[12.5px] text-muted">{item.hint}</span> : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <SignOutButton />
        <p className="pb-4 text-center text-[11.5px] text-subtle">DEVISERA · web</p>
      </div>
    </div>
  );
}
