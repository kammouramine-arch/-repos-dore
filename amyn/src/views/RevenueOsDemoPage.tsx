import Link from "next/link";
import { DemoPlayer } from "@/components/demo/DemoPlayer";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight } from "@/components/ui/Icons";
import { Container, Heading, Label, Section } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { SAMPLE_AUDIT, auditPath, href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { getDemo } from "@/lib/revenue-demo";
import { pageMetadata } from "@/lib/seo";

export function revenueOsDemoMetadata(locale: Locale) {
  const t = getDemo(locale).meta;
  return pageMetadata({
    title: t.title,
    description: t.description,
    locale,
    alternates: routeAlternates("revenueOsDemo"),
  });
}

/**
 * /revenue-os/demo — Revenue OS en fonctionnement, dans une entreprise
 * FICTIVE (Élan Habitat). Le profil de l'entreprise est présenté d'emblée
 * comme inventé ; le lecteur le rappelle sur chaque écran.
 */
export function RevenueOsDemoPage({ locale }: { locale: Locale }) {
  const t = getDemo(locale);
  const ui = getUi(locale);
  const sampleHref = auditPath(SAMPLE_AUDIT[locale], locale);

  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[
          { name: ui.nav.revenueOs, path: href("revenueOs", locale) },
          { name: t.hero.label, path: href("revenueOsDemo", locale) },
        ]}
        label={t.hero.label}
        lines={t.hero.title}
        size="lg"
        lead={t.hero.lead}
        aside={<CompanyCard t={t} />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href="#demo" className="!min-h-14 !px-7 text-[1rem]">
            {t.hero.start}
          </ButtonLink>
          <span className="text-[0.875rem] text-fg-3">{t.hero.duration}</span>
        </div>
      </PageHero>

      <section id="demo" aria-label={t.player.aria} className="tone-ink relative scroll-mt-[calc(var(--header-h)+1rem)] pb-20 sm:pb-28">
        <Container>
          <DemoPlayer t={t} locale={locale} sampleHref={sampleHref} />
        </Container>
      </section>

      <Section tone="ink-2" labelledBy="demo-after" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            <div data-reveal="fade">
              <Label>{t.after.label}</Label>
            </div>
            <Heading id="demo-after" className="mt-8" lines={t.after.title} />
            <p data-reveal className="lead mt-8 max-w-2xl text-fg-2">
              {t.after.lead}
            </p>
            <div data-reveal className="mt-10">
              <ButtonLink href={href("revenueAudit", locale)} className="!min-h-14 !px-7" track="revenue_audit_clicked_from_demo" trackPlace="demo_after">
                {ui.cta.revenueAudit}
              </ButtonLink>
            </div>
          </div>
          <Link
            href={sampleHref}
            data-reveal
            className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-gold/40 bg-[linear-gradient(150deg,rgb(198_167_106/0.12),rgb(242_238_230/0.02)_60%)] p-7 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-gold/70 lg:col-span-5"
          >
            <span className="label text-gold">AMYN Revenue Audit™</span>
            <span className="mt-6 text-[1.6rem] font-semibold tracking-[-0.03em] text-fg">{t.after.sampleTitle}</span>
            <span className="mt-3 text-fg-2">{t.after.sampleBody}</span>
            <span className="mt-8 inline-flex items-center gap-3 text-[0.9375rem] font-medium text-fg">
              {t.after.sampleCta}
              <span aria-hidden className="flex size-10 items-center justify-center rounded-full border border-gold/60 text-gold-2 transition-transform duration-500 group-hover:rotate-45">
                <ArrowUpRight className="size-4" />
              </span>
            </span>
          </Link>
        </Container>
      </Section>
    </>
  );
}

function CompanyCard({ t }: { t: ReturnType<typeof getDemo> }) {
  const c = t.company;
  return (
    <figure className="rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.055),rgb(242_238_230/0.012))] p-6 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-7">
      <figcaption className="label inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.6875rem] text-gold-2">
        <span aria-hidden className="size-1.5 rounded-full bg-gold" />
        {t.fictional}
      </figcaption>
      <p className="mt-6 font-serif text-[2.2rem] leading-none text-fg">{c.name}</p>
      <p className="mt-2 text-[0.9375rem] text-fg-2">{c.kind}</p>
      <p className="text-[0.9375rem] text-fg-3">{c.location}</p>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line">
        {c.figures.map(([label, value], i) => (
          <div key={label} className={`bg-[rgb(16_16_16)] px-4 py-3.5 ${i === c.figures.length - 1 ? "col-span-2" : ""}`}>
            <dt className="text-[0.75rem] text-fg-3">{label}</dt>
            <dd className="mt-1 text-[1.2rem] font-semibold tracking-[-0.02em] text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[0.75rem] leading-relaxed text-fg-3">{c.note}</p>
    </figure>
  );
}
