import { Building2, Database, Repeat, Sparkles, User, UsersRound, Wallet, Workflow } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries/fr';

/**
 * Sections des paramètres : une seule liste, lue par la colonne de navigation
 * (client) et par le hub (serveur). Même découpage que « Mon espace » sur iPhone.
 */
export function settingsSections(t: Dictionary) {
  return [
    { href: '/app/parametres/profil', label: t.settings.profile, hint: t.settings.profileHint, icon: User },
    { href: '/app/parametres/entreprise', label: t.settings.business, hint: t.settings.businessHint, icon: Building2 },
    { href: '/app/parametres/abonnement', label: t.settings.billing, hint: t.settings.billingHint, icon: Wallet },
    { href: '/app/parametres/equipe', label: t.settings.team, hint: t.settings.teamHint, icon: UsersRound },
    { href: '/app/parametres/automatisations', label: t.settings.automations, hint: t.settings.automationsHint, icon: Repeat },
    { href: '/app/parametres/prospects', label: t.settings.leadForm, hint: t.settings.leadFormHint, icon: Workflow },
    { href: '/app/parametres/confidentialite', label: t.settings.privacy, hint: t.settings.privacyHint, icon: Sparkles },
    { href: '/app/parametres/donnees', label: t.settings.data, hint: t.settings.dataHint, icon: Database },
  ];
}

