import Link from "next/link";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { serviceBySlug, servicePath } from "@/lib/services";

/**
 * Section 2 — chaque entreprise a ses propres besoins.
 *
 * Quatre métiers, quatre besoins, et les services qui y répondent : la
 * démonstration que la solution part de l'activité, pas d'un catalogue.
 */
const cases = [
  {
    who: "Un restaurant",
    need: "doit afficher une carte à jour et prendre des réservations sans décrocher pendant le service.",
    services: ["site-web", "reservation-en-ligne", "google-business"],
  },
  {
    who: "Un artisan",
    need: "doit montrer ses chantiers et recevoir des demandes de devis assez complètes pour chiffrer.",
    services: ["portfolio-contenu", "suivi-demandes-devis", "site-web"],
  },
  {
    who: "Un salon",
    need: "doit remplir son agenda, limiter les oublis et donner envie de revenir.",
    services: ["reservation-en-ligne", "application-mobile", "google-business"],
  },
  {
    who: "Une entreprise de services",
    need: "doit inspirer confiance vite, puis accueillir chaque nouveau client sans allers-retours.",
    services: ["site-web", "onboarding-client", "suivi-demandes-devis"],
  },
];

export function Positioning() {
  return (
    <Section tone="ink-2" labelledBy="positionnement-titre">
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="self-start lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:col-span-5">
          <div data-reveal="fade">
            <Label number="01">Sur mesure</Label>
          </div>
          <Heading
            id="positionnement-titre"
            size="md"
            className="mt-8"
            lines={[
              { text: "Un restaurant, un artisan, un salon et un cabinet n'ont pas les mêmes besoins." },
              { accent: "Leur présence digitale ne devrait pas se ressembler." },
            ]}
          />
          <p data-reveal className="lead mt-8 text-fg-2" style={delay(160)}>
            Nous ne partons pas d&apos;un modèle. Nous partons de votre situation :
            comment vos clients vous trouvent, comment ils vous contactent, et ce
            qui vous fait perdre du temps aujourd&apos;hui.
          </p>
        </div>

        <ul className="border-t border-line lg:col-span-6 lg:col-start-7">
          {cases.map((item, i) => (
            <li
              key={item.who}
              data-reveal
              style={delay(i * 70)}
              className="grid gap-4 border-b border-line py-7 sm:grid-cols-[11rem_1fr] sm:gap-8 sm:py-8"
            >
              <p className="font-serif text-[1.6rem] leading-tight">{item.who}</p>
              <div>
                <p className="text-fg-2">{item.need}</p>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Services concernés">
                  {item.services.map((slug) => {
                    const service = serviceBySlug(slug)!;
                    return (
                      <li key={slug}>
                        <Link
                          href={servicePath(slug)}
                          className="label link-line text-fg-3 transition-colors hover:text-fg"
                        >
                          <span className="text-accent">{service.number}</span> {service.short}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
