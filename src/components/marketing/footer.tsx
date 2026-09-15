import Link from 'next/link';
import { Logo, BRAND } from '@/components/brand';
import { SEO_PAGES } from '@/content/seo-pages';

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/#fonctionnalites', label: 'Fonctionnalités' },
      { href: '/#comment', label: 'Comment ça marche' },
      { href: '/#recuperation', label: 'Récupération de CA' },
      { href: '/#tarifs', label: 'Tarifs' },
      { href: '/#faq', label: 'Questions fréquentes' },
    ],
  },
  {
    title: 'Métiers',
    links: SEO_PAGES.slice(2).map((page) => ({
      href: `/${page.slug}`,
      label: page.eyebrow,
    })),
  },
  {
    title: 'Ressources',
    links: [
      { href: '/logiciel-devis-artisan', label: 'Logiciel de devis artisan' },
      { href: '/devis-ia', label: 'Le devis par IA' },
      { href: '/assistance', label: 'Assistance' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/confidentialite', label: 'Confidentialité' },
      { href: '/conditions', label: "Conditions d'utilisation" },
      { href: '/mentions-legales', label: 'Mentions légales' },
      { href: '/cookies', label: 'Cookies' },
      { href: 'mailto:contact@devisera.fr', label: 'Nous contacter' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-line bg-surface">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(47,82,232,0.35),transparent)]" aria-hidden />
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-soft">{BRAND.signature}</p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
              Conçu en France pour les artisans et les petites entreprises de services. Disponible sur le web et sur iPhone, avec un seul compte.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-[13.5px] text-muted transition-colors hover:text-accent-hover">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-subtle">© {new Date().getFullYear()} DEVISERA. Tous droits réservés.</p>
          <p className="text-[12.5px] text-subtle">Les devis préparés par l’IA doivent être vérifiés avant envoi.</p>
        </div>
      </div>
    </footer>
  );
}
