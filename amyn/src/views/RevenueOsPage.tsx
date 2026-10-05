import { PageHero } from "@/components/layout/PageHero";
import { RevenueFlow } from "@/components/revenue/RevenueFlow";
import {
  ArchitectureSection,
  AudienceSection,
  CalculatorSection,
  IntegrationsSection,
  ModulesSection,
  OfferSection,
  ProblemSection,
  ProcessSection,
  ReactivationSection,
  RevenueFaq,
  RevenueFinale,
  SecuritySection,
  StorySection,
  SystemStatement,
} from "@/components/revenue/RevenueSections";
import { ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import { JsonLd } from "@/components/ui/JsonLd";
import type { Locale } from "@/lib/i18n/config";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { getRevenue } from "@/lib/revenue-os";
import { faqSchema, pageMetadata, revenueOsSchema } from "@/lib/seo";

export function revenueOsMetadata(locale: Locale) {
  const t = getRevenue(locale).meta;
  return pageMetadata({
    title: t.pageTitle,
    description: t.pageDescription,
    locale,
    alternates: routeAlternates("revenueOs"),
  });
}

/**
 * /revenue-os — la page de l'offre phare. Du problème à l'engagement :
 * architecture, modules, scénario, intégrations, méthode, données,
 * public, calculateur, prix d'entrée, questions, Revenue Audit.
 *
 * Tout ce qui est chiffré est illustratif et signalé comme tel ; aucune
 * intégration n'est présentée comme déjà réalisée.
 */
export function RevenueOsPage({ locale }: { locale: Locale }) {
  const r = getRevenue(locale);
  const t = r.page;
  const ui = getUi(locale);
  const chapters = [
    "problem",
    "architecture",
    "modules",
    "story",
    "reactivation",
    "integrations",
    "process",
    "security",
    "audience",
    "calculator",
    "offer",
    "faq",
    "final",
  ];
  const n = (key: string) => String(chapters.indexOf(key) + 2).padStart(2, "0");

  return (
    <>
      <JsonLd data={revenueOsSchema(locale)} />
      <JsonLd data={faqSchema(r.faq.items)} />

      <PageHero
        locale={locale}
        crumbs={[{ name: ui.nav.revenueOs, path: href("revenueOs", locale) }]}
        label={t.label}
        lines={t.title}
        size="lg"
        lead={t.lead}
        aside={<RevenueFlow t={r.flow} />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink
            href={href("revenueAudit", locale)}
            className="!min-h-14 !px-7 text-[1rem]"
            track="revenue_audit_cta_clicked"
            trackPlace="revenue_os_hero"
          >
            {ui.cta.revenueAudit}
          </ButtonLink>
          <ButtonLink href={`#${locale === "fr" ? "calculateur" : "calculator"}`} variant="secondary" className="!min-h-14">
            {r.calculator.label}
          </ButtonLink>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.875rem] text-fg-3">
          {t.facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2">
              <Check className="size-3.5 text-gold" />
              {fact}
            </li>
          ))}
        </ul>
      </PageHero>

      <SystemStatement locale={locale} />
      <ProblemSection locale={locale} number={n("problem")} />
      <ArchitectureSection locale={locale} number={n("architecture")} />
      <ModulesSection locale={locale} number={n("modules")} />
      <StorySection locale={locale} number={n("story")} />
      <ReactivationSection locale={locale} number={n("reactivation")} />
      <IntegrationsSection locale={locale} number={n("integrations")} />
      <ProcessSection locale={locale} number={n("process")} />
      <SecuritySection locale={locale} number={n("security")} />
      <AudienceSection locale={locale} number={n("audience")} />
      <CalculatorSection locale={locale} number={n("calculator")} />
      <OfferSection locale={locale} number={n("offer")} />
      <RevenueFaq locale={locale} number={n("faq")} />
      <RevenueFinale locale={locale} number={n("final")} />
    </>
  );
}
