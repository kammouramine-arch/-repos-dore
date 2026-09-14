'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { Logo, LogoMark } from '@/components/brand';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/context';
import { accountNav, isActive, primaryNav, toolsNav, type NavCounts, type NavItem } from './nav';
import { UserMenu, type ShellUser } from './user-menu';

/**
 * Barre latérale de l'espace web.
 *
 * Large sur ordinateur, réduite en rail d'icônes sur tablette (et sur demande
 * sur ordinateur, mémorisé dans le navigateur). Une seule action primaire, le
 * nouveau devis, comme le « + » central de l'application iOS.
 */
export function Sidebar({
  user,
  counts,
  collapsed,
  onToggle,
  onSignOut,
  onSwitchOrganization,
}: {
  user: ShellUser;
  counts: NavCounts;
  collapsed: boolean;
  onToggle: () => void;
  onSignOut: () => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const t = useT();
  const primary = primaryNav(t, counts);
  const tools = toolsNav(t);
  const account = accountNav(t, { teamUnlocked: user.teamUnlocked });

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-canvas md:flex',
        'transition-[width] duration-200 ease-[var(--ease-out-soft)]',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
      aria-label={t.nav.dashboard}
    >
      <div className={cn('flex h-16 items-center', collapsed ? 'justify-center px-2' : 'justify-between pl-5 pr-3')}>
        <Link href="/app" aria-label="DEVISERA, accueil" className="rounded-[8px]">
          {collapsed ? <LogoMark className="h-8 w-8 text-accent" /> : <Logo />}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-[8px] p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label={t.nav.collapse}
            title={t.nav.collapse}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className={cn('px-3', collapsed && 'px-3')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/app/devis/nouveau"
              className={cn(
                'flex h-10 items-center gap-2 rounded-[10px] bg-accent text-[13.5px] font-semibold text-white shadow-glow transition-all hover:bg-accent-hover active:translate-y-px',
                collapsed ? 'w-full justify-center' : 'w-full justify-center px-3',
              )}
            >
              <Plus className="h-[18px] w-[18px]" aria-hidden />
              {!collapsed ? t.nav.newQuote : <span className="sr-only">{t.nav.newQuote}</span>}
            </Link>
          </TooltipTrigger>
          {collapsed ? <TooltipContent>{t.nav.newQuote}</TooltipContent> : null}
        </Tooltip>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {primary.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href, item.exact)} collapsed={collapsed} />
            </li>
          ))}
        </ul>

        <p className={cn('pb-1.5 pt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle', collapsed ? 'sr-only' : 'px-2.5')}>
          {t.nav.tools}
        </p>
        {collapsed ? <div className="mx-3 my-3 h-px bg-line" aria-hidden /> : null}
        <ul className="space-y-0.5">
          {tools.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-3 pb-3 pt-2">
        <ul className="space-y-0.5">
          {account.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href, item.exact)} collapsed={collapsed} />
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <UserMenu
            user={user}
            compact={collapsed}
            onSignOut={onSignOut}
            onSwitchOrganization={onSwitchOrganization}
          />
        </div>
        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            className="mt-1 flex w-full items-center justify-center rounded-[8px] p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label={t.nav.expand}
            title={t.nav.expand}
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors',
        collapsed ? 'h-10 justify-center' : 'px-2.5 py-2',
        active ? 'bg-accent-soft text-accent-hover' : 'text-muted hover:bg-surface hover:text-ink',
      )}
    >
      {active ? (
        <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />
      ) : null}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent' : 'text-subtle group-hover:text-ink-soft')} aria-hidden />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold leading-none text-white tabular">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
      {!collapsed && item.locked ? <Lock className="ml-auto h-3.5 w-3.5 text-subtle" aria-hidden /> : null}
      {collapsed && item.badge ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas" aria-hidden />
      ) : null}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent>
        {item.label}
        {item.badge ? ` · ${item.badge}` : ''}
      </TooltipContent>
    </Tooltip>
  );
}
