'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/context';
import { GlobalSearch } from '../search';
import { NotificationBell } from '../notifications';
import { Sidebar } from './sidebar';
import { MobileTabs } from './mobile-tabs';
import { PageTransition } from './page-transition';
import { UserMenu, type ShellUser } from './user-menu';
import type { NavCounts } from './nav';

export type { ShellUser } from './user-menu';

const COLLAPSE_KEY = 'devisera.sidebar.collapsed';

/**
 * Coque de l'espace web.
 *
 * Ordinateur : barre latérale large et espace de travail. Tablette : rail
 * d'icônes. Mobile : barre d'onglets identique à l'application iOS. La
 * recherche globale (⌘K), les notifications et le menu du compte sont
 * accessibles partout au même endroit.
 */
export function AppShell({
  user,
  counts,
  unreadCount,
  children,
  onSignOut,
  onSwitchOrganization,
}: {
  user: ShellUser;
  counts: NavCounts;
  unreadCount: number;
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const t = useT();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Préférence mémorisée sur cet appareil ; la tablette part réduite.
  React.useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(COLLAPSE_KEY); } catch { stored = null; }
    const tablet = window.matchMedia('(max-width: 1023px)').matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture d'une préférence locale après l'hydratation
    setCollapsed(stored != null ? stored === '1' : tablet);
    setHydrated(true);
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* préférence facultative */ }
      return next;
    });
  }, []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Les écrans de travail (création de devis) prennent toute la largeur utile.
  const wide = pathname.startsWith('/app/devis/nouveau') || /^\/app\/devis\/[^/]+$/.test(pathname);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-surface">
        <Sidebar
          user={user}
          counts={counts}
          collapsed={collapsed}
          onToggle={toggle}
          onSignOut={onSignOut}
          onSwitchOrganization={onSwitchOrganization}
        />

        <div
          className={cn(
            'transition-[padding] duration-200 ease-[var(--ease-out-soft)]',
            hydrated ? (collapsed ? 'md:pl-[72px]' : 'md:pl-[248px]') : 'md:pl-[248px] lg:pl-[248px]',
          )}
        >
          <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6 md:h-16">
              <Link href="/app" className="md:hidden" aria-label="DEVISERA, accueil">
                <LogoMark className="h-8 w-8 text-accent" />
              </Link>

              <button
                type="button"
                onClick={toggle}
                className="hidden rounded-[8px] p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink md:inline-flex lg:hidden"
                aria-label={collapsed ? t.nav.expand : t.nav.collapse}
              >
                <Menu className="h-4 w-4" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 text-left text-[13.5px] text-subtle transition-colors hover:border-line-strong hover:bg-surface-2 md:max-w-md"
                aria-label={t.nav.searchAria}
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{t.common.searchPlaceholder}</span>
                <kbd className="ml-auto hidden rounded-[5px] border border-line bg-canvas px-1.5 py-0.5 text-[10.5px] text-subtle md:block">
                  ⌘K
                </kbd>
              </button>

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <NotificationBell initialUnread={unreadCount} />
                <div className="md:hidden">
                  <UserMenu user={user} compact onSignOut={onSignOut} onSwitchOrganization={onSwitchOrganization} />
                </div>
              </div>
            </div>
          </header>

          <main id="contenu" className="px-4 pb-28 pt-5 sm:px-6 md:pb-12 lg:px-8 lg:pt-7">
            <div className={cn('mx-auto w-full', wide ? 'max-w-[1380px]' : 'max-w-[1180px]')}>
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>

        <MobileTabs />
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}
