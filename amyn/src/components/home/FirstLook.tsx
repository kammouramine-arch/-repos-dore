import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { cta } from "@/lib/site";

/**
 * Section 4 — le premier aperçu.
 *
 * Le mécanisme de conversion central d'AMYN, expliqué honnêtement : une
 * première piste selon le projet, pas un site gratuit.
 */
export const firstLookOutputs = [
  "Une direction de page d'accueil",
  "Une courte analyse de votre site",
  "Une suggestion visuelle",
  "Une amélioration de parcours",
  "Une recommandation pour vos réservations",
  "Une piste pour présenter vos réalisations",
];

const steps = [
  {
    title: "Vous nous montrez votre activité",
    body: "Votre site, votre fiche d'établissement, votre outil de réservation — ou simplement ce qui vous pose problème.",
  },
  {
    title: "Nous regardons avant de proposer",
    body: "Nous étudions ce qui est public et ce que vous nous transmettez, pour repérer ce qui peut vraiment être amélioré.",
  },
  {
    title: "Nous vous montrons une première piste",
    body: "Si le projet s'y prête, vous recevez une direction concrète. Vous décidez ensuite, sans aucune obligation.",
  },
];

export function FirstLook() {
  return (
    <Section tone="paper" labelledBy="apercu-titre" className="overflow-hidden">
      <Container>
        <div data-reveal="fade">
          <Label number="03">Premier aperçu</Label>
        </div>
        <Heading
          id="apercu-titre"
          className="mt-8 max-w-5xl"
          lines={[
            { text: "Avant de vous demander de nous faire confiance," },
            { accent: "montrons-nous utiles." },
          ]}
        />

        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p data-reveal className="lead text-fg-2">
              Présentez-nous votre entreprise. Si le projet s&apos;y prête, nous vous
              montrons concrètement ce que nous changerions — avant toute prestation
              payante, et sans engagement.
            </p>

            <ol className="mt-12 space-y-8">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  data-reveal
                  style={delay(i * 90)}
                  className="grid grid-cols-[2.5rem_1fr] gap-4"
                >
                  <span className="label pt-1 text-accent">0{i + 1}</span>
                  <div>
                    <p className="title">{step.title}</p>
                    <p className="mt-2 text-fg-2">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <div data-reveal className="border-t border-line-strong pt-8">
              <p className="label text-fg-3">Selon votre projet, par exemple</p>
              <ul className="mt-6 divide-y divide-line">
                {firstLookOutputs.map((item) => (
                  <li key={item} className="py-3.5 font-serif text-[1.35rem] leading-snug">
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[0.9375rem] leading-relaxed text-fg-2">
                Ce n&apos;est pas un site réalisé gratuitement : c&apos;est une première
                piste, pour que vous puissiez juger de notre travail avant de vous
                engager.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <ButtonLink href={cta.firstLook.href}>{cta.firstLook.label}</ButtonLink>
                <span className="label text-fg-3">Selon le projet · Sans engagement</span>
              </div>

              <p className="mt-10 text-[0.875rem] text-fg-3">
                Vous avez reçu un message d&apos;AMYN ?{" "}
                <Link href="/premier-apercu#message" className="text-fg underline underline-offset-4">
                  Voici pourquoi
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
