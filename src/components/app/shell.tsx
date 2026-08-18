'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { cn, initials } from '@/lib/utils';
import { GlobalSearch } from './search';
import { NotificationBell } from './notifications';

export interface ShellUser {
  name: string;
  email: string;
  organizationName: string;
  roleLabel: string;
  organizations: { id: string; name: string; current: boolean }[];
}

const PRIMARY_NAV = [
  { href: '/app', label: 'Accueil', icon: Home, exact: true },
  { href: '/app/prospects', label: 'Prospects', icon: MessageSquareText },
  { href: '/app/clients', label: 'Clients', icon: Users },
  { href: '/app/devis', label: 'Devis', icon: FileText },
  { href: '/app/relances', label: 'Relances', icon: Send },
];

const SECONDARY_NAV = [
  { href: '/app/catalogue', label: 'Catalogue', icon: BookOpen },
  { href: '/app/analytique', label: 'Analytique', icon: BarChart3 },
  { href: '/app/assistant', label: 'Assistant', icon: Sparkles },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings },
];

const MOBILE_NAV = [
  { href: '/app', label: 'Accueil', icon: Home, exact: true },
  { href: '/app/prospects', label: 'Prospects', icon: MessageSquareText },
  { href: '/app/devis/nouveau', label: 'Devis', icon: Plus, primary: true },
  { href: '/app/clients', label: 'Clients', icon: Users },
  { href: '/app/plus', label: 'Plus', icon: MoreHorizontal },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  unreadCount,
  children,
  onSignOut,
  onSwitchOrganization,
}: {
  user: ShellUser;
  unreadCount: number;
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);

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

  return (
    <div className="min-h-dvh bg-surface/50">
      {/* Barre latérale — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-line bg-canvas lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/app" aria-label="DEVISIA, accueil">
            <Logo />
          </Link>
        </div>

        <div className="px-3.5">
          <Button asChild className="w-full justify-start" size="md">
            <Link href="/app/devis/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau devis
            </Link>
          </Button>
        </div>

        <nav className="mt-5 flex-1 space-y-0.5 px-3" aria-label="Navigation principale">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(pathname, item.href, item.exact)} />
          ))}

          <p className="px-2.5 pb-1.5 pt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
            Gestion
          </p>
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <UserMenu
            user={user}
            onSignOut={onSignOut}
            onSwitchOrganization={onSwitchOrganization}
          />
        </div>
      </aside>

      {/* Contenu */}
      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Link href="/app" className="lg:hidden" aria-label="DEVISIA, accueil">
              <LogoMark className="h-7 w-7 text-accent" />
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 text-left text-[13.5px] text-subtle transition-colors hover:border-line-strong hover:bg-surface-2 lg:max-w-sm"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Rechercher…</span>
              <kbd className="ml-auto hidden rounded-[5px] border border-line bg-canvas px-1.5 py-0.5 text-[10.5px] text-subtle lg:block">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <NotificationBell initialUnread={unreadCount} />
              <div className="lg:hidden">
                <UserMenu
                  user={user}
                  compact
                  onSignOut={onSignOut}
                  onSwitchOrganization={onSwitchOrganization}
                />
              </div>
            </div>
          </div>
        </header>

        <main id="contenu" className="px-4 pb-28 pt-6 sm:px-6 sm:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>

      {/* Navigation — mobile */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden"
        aria-label="Navigation mobile"
      >
        <ul className="flex items-stretch">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            if (item.primary) {
              return (
                <li key={item.href} className="flex flex-1 justify-center">
                  <Link
                    href={item.href}
                    className="-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform active:scale-95"
                    aria-label="Créer un devis"
                  >
                    <item.icon className="h-6 w-6" aria-hidden />
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors',
                    active ? 'text-accent' : 'text-subtle',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="h-[21px] w-[21px]" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors',
        active ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface hover:text-ink',
      )}
    >
      <Icon className={cn('h-[17px] w-[17px]', active ? 'text-accent' : 'text-subtle')} aria-hidden />
      {label}
    </Link>
  );
}

function UserMenu({
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-left transition-colors hover:bg-surface-2',
            compact && 'w-auto',
          )}
          aria-label="Menu du compte"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
            {initials(user.name || user.email)}
          </span>
          {!compact ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {user.organizationName}
                </span>
                <span className="block truncate text-[11.5px] text-subtle">{user.roleLabel}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={compact ? 'end' : 'start'} className="w-[248px]">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {user.organizations.length > 1 ? (
          <>
            <DropdownMenuLabel>Entreprises</DropdownMenuLabel>
            {user.organizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => void onSwitchOrganization(organization.id)}
              >
                <span className="flex-1 truncate">{organization.name}</span>
                {organization.current ? <span className="text-[11px] text-accent">Actuelle</span> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/app/parametres">
            <Settings className="h-4 w-4" aria-hidden />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/parametres/abonnement">
            <Wallet className="h-4 w-4" aria-hidden />
            Abonnement
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void onSignOut()}>
          <LogOut className="h-4 w-4" aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { Bell };
