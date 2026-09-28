import { Faq } from "@/components/home/Faq";
import { FirstLook } from "@/components/home/FirstLook";
import { Hero } from "@/components/home/Hero";
import { Positioning } from "@/components/home/Positioning";
import {
  BeyondWebsites,
  FinalCta,
  Method,
  WhyAmyn,
  Work,
} from "@/components/home/Sections";
import { ServicesIndex } from "@/components/home/ServicesIndex";
import { Container, Section, SectionIntro } from "@/components/ui/Layout";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { faq } from "@/lib/faq";
import { priceLabel } from "@/lib/pricing";
import { services, servicePath } from "@/lib/services";

/**
 * Accueil — l'histoire complète, dans l'ordre où un visiteur se pose les
 * questions : qui êtes-vous, est-ce pour moi, que faites-vous, comment
 * commencer sans risque, qu'avez-vous déjà fait, comment ça se passe, et
 * maintenant ?
 */
export default function Home() {
  const rows = services.map((s) => ({
    slug: s.slug,
    number: s.number,
    name: s.name,
    summary: s.summary,
    price: priceLabel(s.pricing),
    href: servicePath(s.slug),
  }));

  return (
    <>
      <Hero />
      <Positioning />

      <Section labelledBy="services-titre">
        <Container>
          <SectionIntro
            number="02"
            label="Services"
            id="services-titre"
            className="max-w-4xl"
            lines={[{ text: "Sept façons d'aider" }, { accent: "votre entreprise à mieux fonctionner." }]}
            lead="Du site web à l'application, en passant par la réservation et le suivi des demandes. Chaque projet est cadré selon vos besoins, vos objectifs et les fonctionnalités nécessaires."
          />
          <div className="mt-14 lg:mt-20">
            <ServicesIndex
              rows={rows}
              previews={services.map((s) => (
                <ServiceVisual key={s.slug} visual={s.visual} />
              ))}
            />
          </div>
        </Container>
      </Section>

      <FirstLook />
      <Work />
      <Method />
      <BeyondWebsites />
      <WhyAmyn />
      <Faq items={faq} number="08" />
      <FinalCta number="09" />
    </>
  );
}
