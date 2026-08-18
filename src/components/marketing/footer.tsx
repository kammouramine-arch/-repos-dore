import Link from 'next/link';
import { Logo, BRAND } from '@/components/brand';
import { SEO_PAGES } from '@/content/seo-pages';

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/#fonctionnalites', label: 'Fonctionnalités' },
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
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/confidentialite', label: 'Confidentialité' },
      { href: '/conditions', label: "Conditions d'utilisation" },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted">
              {BRAND.signature} Conçu en France pour les artisans et les petites entreprises de services.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">
                {column.title}
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-subtle">
            © {new Date().getFullYear()} DEVISIA. Tous droits réservés.
          </p>
          <p className="text-[12.5px] text-subtle">
            Les devis préparés par l’IA doivent être vérifiés avant envoi.
          </p>
        </div>
      </div>
    </footer>
  );
}
