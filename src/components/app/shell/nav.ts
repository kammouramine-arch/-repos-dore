import {
  BarChart3,
  BookOpen,
  FileText,
  Home,
  LifeBuoy,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Send,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries/fr';

/**
 * Structure de navigation de l'espace web.
 *
 * Les libellés viennent du dictionnaire actif ; la structure, elle, est la
 * même que celle de l'application iOS (Accueil, Clients, +, Devis, Plus) pour
 * la barre mobile, et s'étend sur ordinateur avec ce que l'écran permet
 * d'afficher sans encombrer : le travail quotidien d'abord, les outils
 * ensuite, le compte en bas.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  /** Affiché sur la ligne (ex. nombre de relances à faire). */
  badge?: number;
  /** Fonction réservée à une formule supérieure : la ligne le dit sans la cacher. */
  locked?: boolean;
}

export interface NavCounts {
  followUps: number;
  leads: number;
}

export function primaryNav(t: Dictionary, counts: NavCounts): NavItem[] {
  return [
    { href: '/app', label: t.nav.home, icon: Home, exact: true },
    { href: '/app/devis', label: t.nav.quotes, icon: FileText },
    { href: '/app/clients', label: t.nav.customers, icon: Users },
    { href: '/app/relances', label: t.nav.followUps, icon: Send, badge: counts.followUps },
    { href: '/app/prospects', label: t.nav.leads, icon: MessageSquareText, badge: counts.leads },
  ];
}

export function toolsNav(t: Dictionary): NavItem[] {
  return [
    { href: '/app/catalogue', label: t.nav.priceBook, icon: BookOpen },
    { href: '/app/analytique', label: t.nav.analytics, icon: BarChart3 },
    { href: '/app/assistant', label: t.nav.assistant, icon: Sparkles },
  ];
}

export function accountNav(t: Dictionary, options: { teamUnlocked: boolean }): NavItem[] {
  return [
    { href: '/app/parametres/equipe', label: t.nav.team, icon: UsersRound, locked: !options.teamUnlocked },
    { href: '/app/parametres/abonnement', label: t.nav.subscription, icon: Wallet },
    { href: '/app/parametres', label: t.nav.settings, icon: Settings, exact: true },
    { href: '/app/aide', label: t.nav.help, icon: LifeBuoy },
  ];
}

/** Barre mobile : exactement les onglets de l'application iOS, dans le même ordre. */
export function mobileNav(t: Dictionary): (NavItem & { primary?: boolean })[] {
  return [
    { href: '/app', label: t.nav.home, icon: Home, exact: true },
    { href: '/app/clients', label: t.nav.customers, icon: Users },
    { href: '/app/devis/nouveau', label: t.nav.newQuote, icon: Plus, primary: true },
    { href: '/app/devis', label: t.nav.quotes, icon: FileText },
    { href: '/app/plus', label: t.nav.more, icon: MoreHorizontal },
  ];
}

export function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
