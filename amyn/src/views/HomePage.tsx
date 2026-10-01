import Image from "next/image";
import { Faq } from "@/components/home/Faq";
import { FirstLook } from "@/components/home/FirstLook";
import { Hero } from "@/components/home/Hero";
import { SectorStrip } from "@/components/home/SectorStrip";
import { FinalCta, Method, Tools, Work } from "@/components/home/Sections";
import { ServicesShowcase } from "@/components/home/ServicesShowcase";
import { ProofSprintCard } from "@/components/proofsprint/ProofSprintCard";
import { Testimonials, hasTestimonials } from "@/components/home/Testimonials";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section } from "@/components/ui/Layout";
import { getFaq } from "@/lib/faq";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";
import { routeAlternates, servicePath } from "@/lib/i18n/routes";
import { pageMetadata } from "@/lib/seo";
import { getServices } from "@/lib/services";
import { shot, shotSrc } from "@/lib/visuals";

export function homeMetadata(locale: Locale) {
  const t = getDictionary(locale);
  return {
    ...pageMetadata({
      title: t.meta.title,
      description: t.meta.description,
      locale,
      alternates: routeAlternates("home"),
    }),
    /* L'accueil porte le titre complet, sans le suffixe « · AMYN ». */
    title: { absolute: t.meta.title },
  };
}

/**
 * Accueil — montrer plutôt qu'expliquer : ce que fait AMYN, pour qui, les
 * sept services, la preuve (réalisations, outils), la méthode, et une seule
 * action : le premier aperçu.
 *
 * Les chapitres sont numérotés dans l'ordre d'affichage : si une section
 * n'a rien à montrer (témoignages), la numérotation reste continue.
 */
export function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const cta = ctas(locale);

  const chapters = [
    "services",
    "firstLook",
    "work",
    "tools",
    "method",
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
      <Hero locale={locale} />
      <SectorStrip locale={locale} />

      <Section labelledBy="services-titre" className="seam">
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

      <FirstLook locale={locale} number={n("firstLook")} />
      <Work locale={locale} number={n("work")} />
      <Tools locale={locale} number={n("tools")} />
      <Method locale={locale} number={n("method")} />
      <Testimonials locale={locale} number={n("testimonials")} />
      <Faq locale={locale} items={getFaq(locale).slice(0, 5)} number={n("faq")} size="lg" />
      <FinalCta locale={locale} number={n("final")} />
    </>
  );
}
