'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, ChevronsUpDown, LifeBuoy, LogOut, Settings, User, Wallet } from 'lucide-react';
import type { PlanId } from '@devisia/shared';
import { PLANS } from '@devisia/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { cn, initials } from '@/lib/utils';
import { useT } from '@/lib/i18n/context';

export interface ShellUser {
  name: string;
  email: string;
  organizationName: string;
  roleLabel: string;
  plan: PlanId;
  /** « essai », « actif », « à régulariser »… déjà traduit par le serveur. */
  planState: string;
  teamUnlocked: boolean;
  avatarUrl: string | null;
  organizations: { id: string; name: string; current: boolean }[];
}

/**
 * Carte du compte : entreprise, formule et personne, puis le menu.
 *
 * Reprend « Mon espace » iOS : l'identité d'abord, l'action ensuite.
 */
export function UserMenu({
  user,
  compact = false,
  onSignOut,
  onSwitchOrganization,
}: {
  user: ShellUser;
  compact?: boolean;
  onSignOut: () => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
}) {
  const t = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'pressable flex items-center gap-2.5 rounded-[12px] text-left transition-colors hover:bg-surface-2',
            compact ? 'mx-auto h-10 w-10 justify-center' : 'w-full p-2',
          )}
          aria-label={t.nav.account}
        >
          <Avatar name={user.name || user.email} url={user.avatarUrl} />
          {!compact ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{user.organizationName}</span>
                <span className="block truncate text-[11.5px] text-muted">
                  {PLANS[user.plan].name} · {user.planState}
                </span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={compact ? 'end' : 'start'} side={compact ? 'right' : 'top'} className="w-[264px]">
        <div className="px-2.5 py-2">
          <p className="truncate text-[13.5px] font-semibold text-ink">{user.name}</p>
          <p className="truncate text-[12px] text-muted">{user.email}</p>
          <p className="mt-1 text-[11.5px] text-subtle">
            {user.roleLabel} · {PLANS[user.plan].name}
          </p>
        </div>
        <DropdownMenuSeparator />

        {user.organizations.length > 1 ? (
          <>
            <DropdownMenuLabel>{t.nav.organizations}</DropdownMenuLabel>
            {user.organizations.map((organization) => (
              <DropdownMenuItem key={organization.id} onSelect={() => void onSwitchOrganization(organization.id)}>
                <span className="flex-1 truncate">{organization.name}</span>
                {organization.current ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden /> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/app/parametres/profil">
            <User className="h-4 w-4" aria-hidden />
            {t.nav.profile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/parametres">
            <Settings className="h-4 w-4" aria-hidden />
            {t.nav.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/parametres/abonnement">
            <Wallet className="h-4 w-4" aria-hidden />
            {t.nav.subscription}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/aide">
            <LifeBuoy className="h-4 w-4" aria-hidden />
            {t.nav.help}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void onSignOut()}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Avatar({ name, url, size = 'md' }: { name: string; url: string | null; size?: 'md' | 'lg' }) {
  const dimension = size === 'lg' ? 'h-12 w-12 text-[15px]' : 'h-9 w-9 text-[12px]';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn('shrink-0 rounded-full object-cover ring-1 ring-line', dimension)} />;
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent ring-1 ring-accent-border/60',
        dimension,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
