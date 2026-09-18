'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités', section: 'fonctionnalites' },
  { href: '/#comment', label: 'Comment ça marche', section: 'comment' },
  { href: '/#tarifs', label: 'Tarifs', section: 'tarifs' },
  { href: '/logiciel-devis-artisan', label: 'Métiers', section: null },
  { href: '/#faq', label: 'FAQ', section: 'faq' },
];

/**
 * Navigation du site. Transparente sur la lumière du héros, elle se compacte
 * et se pose sur un voile blanc dès le premier défilement. Sur la page
 * d'accueil, la section visible est soulignée.
 */
export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(null);
  const activeSection = pathname === '/' ? active : null;

  // Le menu mobile se referme dès que la route change (ajustement d'état pendant le rendu).
  const [lastPathname, setLastPathname] = React.useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    if (pathname !== '/') return undefined;
    const sections = LINKS.map((link) => link.section).filter((section): section is string => Boolean(section));
    const elements = sections.map((section) => document.getElementById(section)).filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return undefined;
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        }
        setActive(sections.find((section) => inView.has(section)) ?? null);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5] },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300',
        scrolled || open
          ? 'bg-canvas/80 shadow-[0_1px_0_rgba(232,236,242,0.9),0_12px_32px_-24px_rgba(10,26,74,0.35)] backdrop-blur-xl'
          : 'bg-transparent',
      )}
    >
      <div className={cn('container-page flex items-center justify-between gap-6 transition-[height] duration-300', scrolled ? 'h-14' : 'h-[68px]')}>
        <Link href="/" className="shrink-0 rounded-[8px] transition-opacity hover:opacity-85" aria-label="DEVISERA, accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navigation principale">
          {LINKS.map((link) => {
            const current = link.section ? activeSection === link.section || pathname === `/${link.section}` : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'relative rounded-[9px] px-3 py-2 text-[13.5px] font-medium transition-colors',
                  current ? 'text-ink' : 'text-muted hover:text-ink',
                  'after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-300 hover:after:scale-x-100',
                  current && 'after:scale-x-100',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild size="sm" className="group pl-4 pr-3.5 shadow-glow hover:-translate-y-px">
            <Link href="/inscription">
              Créer mon compte
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-[9px] p-2 text-ink-soft transition-colors hover:bg-surface-2 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        id="menu-mobile"
        className={cn('grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-soft)] lg:hidden', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="container-page space-y-1 border-t border-line py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                tabIndex={open ? 0 : -1}
                className="block rounded-[10px] px-3 py-2.5 text-[15px] font-medium text-ink-soft transition-colors hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/connexion" tabIndex={open ? 0 : -1}>Se connecter</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/inscription" tabIndex={open ? 0 : -1}>Créer mon compte</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
