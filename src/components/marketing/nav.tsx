'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#recuperation', label: 'Récupération de CA' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/logiciel-devis-artisan', label: 'Métiers' },
  { href: '/#faq', label: 'FAQ' },
];

export function MarketingNav() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-all duration-200',
        scrolled ? 'border-line bg-canvas/85 backdrop-blur-md' : 'border-transparent bg-canvas',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="DEVISIA, accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[8px] px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/inscription">Créer mon compte</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-[8px] p-2 text-ink-soft transition-colors hover:bg-surface-2 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div id="menu-mobile" className="border-t border-line bg-canvas lg:hidden">
          <div className="container-page space-y-1 py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-[10px] px-3 py-2.5 text-[15px] font-medium text-ink-soft hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/connexion">Se connecter</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/inscription">Créer mon compte</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
