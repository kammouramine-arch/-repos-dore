import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { cta } from "@/lib/site";

/**
 * Le premier aperçu — le cœur de la méthode commerciale d'AMYN, en trois
 * temps et trois phrases.
 */
export const firstLookOutputs = [
  "Une direction de page d'accueil",
  "Une courte analyse de votre site",
  "Une piste pour vos réservations",
  "Une idée pour vos demandes et devis",
];

const steps = [
  { title: "Vous nous montrez", body: "Votre site, votre fiche Google ou simplement ce qui coince." },
  { title: "Nous regardons", body: "Nous repérons ce qui peut vraiment être amélioré." },
  { title: "On vous montre", body: "Une première piste concrète. Vous décidez ensuite." },
];

export function FirstLook() {
  return (
    <Section tone="paper" labelledBy="apercu-titre" className="overflow-hidden">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div data-reveal="fade">
              <Label number="03">Premier aperçu</Label>
            </div>
            <Heading
              id="apercu-titre"
              className="mt-7"
              lines={[{ text: "Avant la confiance," }, { accent: "la preuve." }]}
            />
          </div>
          <p data-reveal className="lead text-fg-2 lg:col-span-4">
            Montrez-nous votre entreprise. Nous vous montrons d&apos;abord ce que nous
            changerions — sans engagement.
          </p>
        </div>

        <ol className="mt-14 grid gap-4 sm:mt-20 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              data-reveal
              style={delay(i * 110)}
              className="lift-card relative overflow-hidden rounded-[1.25rem] border border-line bg-[rgb(255_255_255/0.45)] p-7 sm:p-9"
            >
              <span
                aria-hidden
                className="block text-[5.5rem] font-semibold leading-none tracking-[-0.06em] text-[rgb(10_10_10/0.08)]"
              >
                0{i + 1}
              </span>
              <p className="mt-2 text-[1.5rem] font-semibold tracking-[-0.03em]">{step.title}</p>
              <p className="mt-2 text-fg-2">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col gap-6 sm:mt-16 lg:flex-row lg:items-center lg:justify-between">
          <ul data-reveal className="flex flex-wrap gap-2" aria-label="Exemples de premier aperçu">
            {firstLookOutputs.map((o) => (
              <li key={o} className="rounded-full border border-line-strong px-4 py-2 text-[0.875rem] text-fg-2">
                {o}
              </li>
            ))}
          </ul>
          <div data-reveal className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <ButtonLink href={cta.firstLook.href} className="!min-h-14 !px-7">
              {cta.firstLook.label}
            </ButtonLink>
            <Link href="/premier-apercu#message" className="hit-area text-[0.875rem] text-fg-2 underline underline-offset-4 hover:text-fg">
              Vous avez reçu un message d&apos;AMYN ?
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
