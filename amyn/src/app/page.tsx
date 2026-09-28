import Image from "next/image";
import { Faq } from "@/components/home/Faq";
import { FirstLook } from "@/components/home/FirstLook";
import { Hero } from "@/components/home/Hero";
import { SectorStrip } from "@/components/home/SectorStrip";
import { FinalCta, Method, Tools, Work } from "@/components/home/Sections";
import { ServicesShowcase } from "@/components/home/ServicesShowcase";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section } from "@/components/ui/Layout";
import { faq } from "@/lib/faq";
import { services, servicePath } from "@/lib/services";
import { cta } from "@/lib/site";
import { shot, shotSrc } from "@/lib/visuals";

/**
 * Accueil — montrer plutôt qu'expliquer : ce que fait AMYN, pour qui, les
 * sept services, la preuve (réalisations, outils), la méthode, et une seule
 * action : le premier aperçu.
 */
export default function Home() {
  const rows = services.map((s) => {
    const sh = shot(s.shot);
    return {
      slug: s.slug,
      number: s.number,
      name: s.name,
      tagline: s.tagline,
      href: servicePath(s.slug),
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
      <Hero />
      <SectorStrip />

      <Section labelledBy="services-titre" className="seam">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div data-reveal="fade">
                <Label number="02">Services</Label>
              </div>
              <Heading
                id="services-titre"
                className="mt-7"
                lines={[{ text: "Sept façons" }, { text: "de mieux", accent: "travailler." }]}
              />
            </div>
            <ButtonLink href={cta.services.href} variant="secondary" className="self-start lg:self-auto">
              {cta.services.label}
            </ButtonLink>
          </div>
          <div className="mt-12 sm:mt-16">
            <ServicesShowcase rows={rows} />
          </div>
          <p className="label mt-8 text-bone-3">Chaque projet est cadré et chiffré sur devis.</p>
        </Container>
      </Section>

      <FirstLook />
      <Work />
      <Tools />
      <Method />
      <Faq items={faq.slice(0, 5)} number="07" />
      <FinalCta number="08" />
    </>
  );
}
