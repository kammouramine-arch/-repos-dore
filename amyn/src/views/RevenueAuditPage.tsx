import { RevenueAuditForm } from "@/components/forms/RevenueAuditForm";
import { PageHero } from "@/components/layout/PageHero";
import { RevenueFaq } from "@/components/revenue/RevenueSections";
import { ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import { JsonLd } from "@/components/ui/JsonLd";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { SAMPLE_AUDIT, auditPath, href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { getRevenue } from "@/lib/revenue-os";
import { faqSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export function revenueAuditMetadata(locale: Locale) {
  const t = getRevenue(locale).meta;
  return pageMetadata({
    title: t.auditTitle,
    description: t.auditDescription,
    locale,
    alternates: routeAlternates("revenueAudit"),
  });
}

/* Ancre stable : boutons de la page et liens directs (…/revenue-audit#application). */
const APPLICATION = "application";

/**
 * /revenue-audit — page d'atterrissage de la porte d'entrée de Revenue OS :
 * ce que l'audit regarde (le parcours demande → client), ce qu'il produit,
 * puis la demande en cinq étapes. Aucune promesse chiffrée.
 */
export function RevenueAuditPage({ locale }: { locale: Locale }) {
  const r = getRevenue(locale);
  const t = r.audit;
  const ui = getUi(locale);

  return (
    <>
      <JsonLd data={faqSchema(t.faq)} />

      <PageHero
        locale={locale}
        crumbs={[
          { name: ui.nav.revenueOs, path: href("revenueOs", locale) },
          { name: ui.cta.revenueAuditShort, path: href("revenueAudit", locale) },
        ]}
        label={t.label}
        lines={t.title}
        size="lg"
        lead={t.lead}
        aside={<LeakMap steps={t.journey.map(([name]) => name)} />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={`#${APPLICATION}`} className="!min-h-14 !px-7 text-[1rem]">
            {t.start}
          </ButtonLink>
          <ButtonLink href={href("revenueOs", locale)} variant="secondary" className="!min-h-14" track="revenue_os_cta_clicked" trackPlace="audit_hero">
            {ui.cta.revenueOs}
          </ButtonLink>
        </div>
      </PageHero>

      {/* Ce que l'audit regarde */}
      <Section tone="ink-2" labelledBy="audit-journey" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label number="02">{t.journeyLabel}</Label>
          </div>
          <Heading id="audit-journey" className="mt-8 max-w-4xl" lines={t.journeyTitle} />
          <ol className="mt-14 border-t border-line">
            {t.journey.map(([name, question], i) => (
              <li
                key={name}
                data-reveal
                style={delay((i % 4) * 50)}
                className="grid items-baseline gap-2 border-b border-line py-6 sm:grid-cols-[4rem_14rem_1fr] sm:gap-6"
              >
                <span className="font-mono text-[0.8125rem] text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[1.3rem] font-semibold tracking-[-0.025em] text-fg">{name}</h3>
                <p className="text-fg-2">{question}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Ce qu'il produit */}
      <Section labelledBy="audit-outcomes" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label number="03">{t.outcomesLabel}</Label>
          </div>
          <h2 id="audit-outcomes" className="sr-only">
            {t.outcomesLabel}
          </h2>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.outcomes.map((o, i) => (
              <li key={o.title} data-reveal style={delay(i * 70)} className="rounded-[var(--radius-md)] border border-line bg-[rgb(242_238_230/0.025)] p-6">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-full border border-gold/60 text-gold">
                  <Check className="size-4" />
                </span>
                <h3 className="mt-6 text-[1.2rem] font-semibold tracking-[-0.025em] text-fg">{o.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-2">{o.body}</p>
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={auditPath(SAMPLE_AUDIT[locale], locale)} className="link-line inline-flex min-h-11 items-center text-fg">
              {r.demo.sample}
            </a>
            <span className="text-[0.875rem] text-fg-3">{r.demo.note}</span>
          </p>
        </Container>
      </Section>

      {/* La demande */}
      <Section tone="ink-2" id={APPLICATION} labelledBy="audit-form" className="seam scroll-mt-[var(--header-h)]">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div data-reveal="fade">
              <Label number="04">{t.formLabel}</Label>
            </div>
            <Heading id="audit-form" size="md" className="mt-8" lines={t.formTitle} />
            <p data-reveal className="mt-8 text-fg-2">
              {t.formLead}
            </p>
            <p data-reveal className="mt-8 text-fg-3">
              <a href={`mailto:${site.email}?subject=Revenue%20Audit`} className="text-fg underline underline-offset-4">
                {site.email}
              </a>
            </p>
          </div>
          <div className="lg:col-span-8">
            <div className="rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-10">
              <RevenueAuditForm locale={locale} />
            </div>
          </div>
        </Container>
      </Section>

      <RevenueFaq locale={locale} number="05" items={t.faq} title={t.faqTitle} />
    </>
  );
}

/**
 * Le parcours demande → client, avec ses points de fuite possibles.
 * Décoratif : la liste est lue dans la section suivante.
 */
function LeakMap({ steps }: { steps: string[] }) {
  return (
    <div
      aria-hidden
      className="relative rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.055),rgb(242_238_230/0.012))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-7"
    >
      <ol className="relative">
        <span className="absolute bottom-4 left-[0.6875rem] top-4 w-px bg-gradient-to-b from-gold via-gold/50 to-gold" />
        {steps.map((s, i) => {
          const end = i === 0 || i === steps.length - 1;
          return (
            <li key={s} className="relative flex items-center gap-4 py-2.5">
              <span
                className={`relative z-10 flex size-[1.4rem] shrink-0 items-center justify-center rounded-full border ${
                  end ? "border-gold bg-gold" : "border-gold/60 bg-canvas"
                }`}
              >
                {!end && <span className="size-1.5 rounded-full bg-gold" />}
              </span>
              <span className={`text-[1rem] ${end ? "font-semibold text-fg" : "text-fg-2"}`}>{s}</span>
              {!end && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="h-px w-8 border-t border-dashed border-[rgb(220_140_120/0.55)] sm:w-14" />
                  <span className="flex size-6 items-center justify-center rounded-full border border-[rgb(220_140_120/0.55)] font-mono text-[0.75rem] text-[#f3c0b2]">
                    ?
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
