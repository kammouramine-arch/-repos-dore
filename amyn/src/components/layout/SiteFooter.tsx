import Link from "next/link";
import { Container } from "@/components/ui/Layout";
import { services, servicePath } from "@/lib/services";
import { cta, legalNav, site, social } from "@/lib/site";
import { Logo } from "./Logo";

const studio = [
  { label: "Réalisations", href: "/realisations" },
  { label: "Méthode", href: "/methode" },
  { label: "À propos", href: "/a-propos" },
  { label: "Premier aperçu", href: cta.firstLook.href },
  { label: "Contact", href: cta.project.href },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="tone-ink border-t border-line pb-10 pt-16 sm:pt-20">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" aria-label={`${site.name} — accueil`} className="inline-block">
              <Logo />
            </Link>
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-relaxed text-fg-2">
              {site.tagline}
            </p>
            <a
              href={`mailto:${site.email}`}
              className="link-line mt-6 inline-block text-[0.9375rem] text-fg"
            >
              {site.email}
            </a>
          </div>

          <FooterColumn title="Services" className="lg:col-span-3 lg:col-start-6">
            {services.map((s) => (
              <FooterLink key={s.slug} href={servicePath(s.slug)}>
                {s.short}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Studio" className="lg:col-span-2">
            {studio.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Informations" className="lg:col-span-2">
            {legalNav.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
            {social.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-[0.9375rem] text-fg-2 transition-colors hover:text-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 text-[0.8125rem] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.legalBrand}
          </p>
          <p>Studio digital — France</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="label text-fg-3">{title}</h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-[0.9375rem] text-fg-2 transition-colors hover:text-fg">
        {children}
      </Link>
    </li>
  );
}
