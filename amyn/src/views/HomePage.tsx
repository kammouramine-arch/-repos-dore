import Image from "next/image";
import { Hero } from "@/components/home/Hero";
import { Work } from "@/components/home/Sections";
import { ServicesShowcase } from "@/components/home/ServicesShowcase";
import { Testimonials, hasTestimonials } from "@/components/home/Testimonials";
import { ProofSprintCard } from "@/components/proofsprint/ProofSprintCard";
import {
  AudienceSection,
  CalculatorSection,
  CapabilitiesSection,
  DashboardSection,
  DemoBanner,
  FlagshipIntro,
  ModulesSection,
  OfferSection,
  ProblemSection,
  ProcessSection,
  ReactivationSection,
  RevenueFaq,
  RevenueFinale,
  StorySection,
  SystemStatement,
} from "@/components/revenue/RevenueSections";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/ui/JsonLd";
import { Container, Heading, Label, Section } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";
import { routeAlternates, servicePath } from "@/lib/i18n/routes";
import { getRevenue } from "@/lib/revenue-os";
import { faqSchema, pageMetadata } from "@/lib/seo";
import { getServices } from "@/lib/services";
import { shot, shotSrc } from "@/lib/visuals";

export function homeMetadata(locale: Locale) {
  const t = getRevenue(locale).meta;
  return {
    ...pageMetadata({
      title: t.homeTitle,
      description: t.homeDescription,
      locale,
      alternates: routeAlternates("home"),
    }),
    /* L'accueil porte le titre complet, sans le suffixe « · AMYN ». */
    title: { absolute: t.homeTitle },
  };
}

/**
 * Accueil — l'offre phare d'abord : AMYN Revenue OS (le système, ses
 * modules, un scénario, la vue direction, le calculateur, l'engagement),
 * puis les capacités plus larges d'AMYN (sites, applications, produits),
 * les sept services, les réalisations et une seule action : le Revenue
 * Audit.
 *
 * Les chapitres sont numérotés dans l'ordre d'affichage : si une section
 * n'a rien à montrer (témoignages), la numérotation reste continue.
 */
export function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const cta = ctas(locale);
  const faq = getRevenue(locale).faq.items.slice(0, 5);

  const chapters = [
    "flagship",
    "modules",
    "story",
    "problem",
    "reactivation",
    "dashboard",
    "calculator",
    "audience",
    "process",
    "offer",
    "capabilities",
    "services",
    "work",
    ...(hasTestimonials(locale) ? ["testimonials"] : []),
    "faq",
    "final",
  ];
  /* Le hero est le chapitre 01. */
  const n = (key: string) => String(chapters.indexOf(key) + 2).padStart(2, "0");

  const rows = getServices(locale).map((s) => {
    const sh = shot(s.shot);
    return {
      slug: s.slug,
      number: s.number,
      name: s.name,
      tagline: s.tagline,
      href: servicePath(s.slug, locale),
      phone: sh.kind === "phone",
      thumb: (
        <Image
          src={shotSrc(s.shot)}
          alt=""
          fill
          sizes="(min-width: 1024px) 420px, 150px"
          quality={82}
          className="object-cover object-top"
        />
      ),
    };
  });

  return (
    <>
      <JsonLd data={faqSchema(faq)} />
      <Hero locale={locale} />
      <SystemStatement locale={locale} />
      <FlagshipIntro locale={locale} number={n("flagship")} />
      <ModulesSection locale={locale} number={n("modules")} />
      <StorySection locale={locale} number={n("story")} />
      <DemoBanner locale={locale} />
      <ProblemSection locale={locale} number={n("problem")} />
      <ReactivationSection locale={locale} number={n("reactivation")} />
      <DashboardSection locale={locale} number={n("dashboard")} />
      <CalculatorSection locale={locale} number={n("calculator")} />
      <AudienceSection locale={locale} number={n("audience")} />
      <ProcessSection locale={locale} number={n("process")} />
      <OfferSection locale={locale} number={n("offer")} />
      <CapabilitiesSection locale={locale} number={n("capabilities")} />

      <Section tone="ink-2" labelledBy="services-titre" className="seam">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div data-reveal="fade">
                <Label number={n("services")}>{t.home.services.label}</Label>
              </div>
              <Heading id="services-titre" className="mt-7" lines={t.home.services.title} />
            </div>
            <ButtonLink href={cta.services.href} variant="secondary" className="self-start lg:self-auto">
              {cta.services.label}
            </ButtonLink>
          </div>
          <div className="mt-12 sm:mt-16">
            <ServicesShowcase rows={rows} />
          </div>
          <p className="label mt-8 text-bone-3">{t.home.services.note}</p>
          <ProofSprintCard locale={locale} className="mt-12 sm:mt-16" />
        </Container>
      </Section>

      <Work locale={locale} number={n("work")} />
      <Testimonials locale={locale} number={n("testimonials")} />
      <RevenueFaq locale={locale} number={n("faq")} items={faq} />
      <RevenueFinale locale={locale} number={n("final")} />
    </>
  );
}
