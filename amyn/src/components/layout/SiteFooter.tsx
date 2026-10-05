import Link from "next/link";
import { Container } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href, servicePath } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { legal } from "@/lib/legal";
import { getServices } from "@/lib/services";
import { site, social } from "@/lib/site";
import { Logo } from "./Logo";

export function SiteFooter({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();
  const t = getDictionary(locale);
  const n = getUi(locale).nav;
  const cta = getUi(locale).cta;
  const revenue = [
    { label: "AMYN Revenue OS™", href: href("revenueOs", locale) },
    { label: cta.revenueAuditShort, href: href("revenueAudit", locale) },
    { label: n.proofsprint, href: href("proofsprint", locale) },
  ];
  const studio = [
    { label: n.work, href: href("work", locale) },
    { label: n.method, href: href("method", locale) },
    { label: n.about, href: href("about", locale) },
    { label: n.firstLook, href: href("firstLook", locale) },
  ];
  const legalNav = [
    { label: t.legalNav.legalNotice, href: href("legalNotice", locale) },
    { label: t.legalNav.privacy, href: href("privacy", locale) },
    { label: t.legalNav.cookies, href: href("cookies", locale) },
    { label: t.legalNav.terms, href: href("terms", locale) },
  ];

  return (
    <footer data-site-chrome="" className="tone-ink border-t border-line pb-10 pt-16 sm:pt-20">
      <Container>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <Link href={href("home", locale)} aria-label={`${site.name} — ${t.common.homeAria}`} className="inline-block">
              <Logo />
            </Link>
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-relaxed text-fg-2">
              {t.meta.tagline}
            </p>
            <a
              href={`mailto:${site.email}`}
              className="link-line mt-6 inline-block text-[0.9375rem] text-fg"
            >
              {site.email}
            </a>
          </div>

          <FooterColumn title={t.footer.revenue} className="lg:col-span-2">
            {revenue.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t.footer.services} className="lg:col-span-2">
            {getServices(locale).map((s) => (
              <FooterLink key={s.slug} href={servicePath(s.slug, locale)}>
                {s.short}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t.footer.studio} className="lg:col-span-2">
            {studio.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t.footer.info} className="lg:col-span-2">
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
                  className="hit-area text-[0.9375rem] text-fg-2 transition-colors hover:text-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 text-[0.8125rem] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.legalBrand} — {legal.publisherName}, EI
          </p>
          <p>{t.common.studio}</p>
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
      <Link href={href} className="hit-area text-[0.9375rem] text-fg-2 transition-colors hover:text-fg">
        {children}
      </Link>
    </li>
  );
}
