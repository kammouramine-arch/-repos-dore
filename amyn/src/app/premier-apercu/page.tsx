import Link from "next/link";
import { Faq } from "@/components/home/Faq";
import { FirstLookForm, OutreachNotice } from "@/components/forms/FirstLookForm";
import { PageHero } from "@/components/layout/PageHero";
import { Check } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { firstLookOutputs } from "@/components/home/FirstLook";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Recevoir un premier aperçu",
  description:
    "Présentez-nous votre entreprise. Si le projet s'y prête, nous vous montrons une première piste concrète avant toute prestation payante. Sans engagement.",
  path: "/premier-apercu",
});

const reviewed = [
  "Votre site",
  "Votre présence sur Google",
  "Votre parcours de réservation",
  "Votre expérience sur mobile",
  "Le traitement de vos demandes",
  "L'accueil de vos nouveaux clients",
  "Vos réalisations et contenus",
  "Un autre fonctionnement interne",
];

const promises = [
  "Aucune obligation d'achat",
  "Aucun engagement automatique",
  "Aucune condition cachée",
];

const questions = [
  {
    q: "Est-ce vraiment sans engagement ?",
    a: "Oui. Envoyer ce formulaire ne vous engage à rien, et recevoir une première piste non plus. Si vous souhaitez aller plus loin, nous vous proposons un devis ; vous restez libre de ne pas y donner suite.",
  },
  {
    q: "Qu'est-ce que je vais recevoir exactement ?",
    a: "Cela dépend de votre situation : une direction de page d'accueil, une courte analyse, une recommandation pour vos réservations ou votre accueil client… Nous choisissons le format le plus utile après avoir regardé votre activité. Ce n'est pas un site ou un outil réalisé gratuitement.",
  },
  {
    q: "Et si mon projet ne s'y prête pas ?",
    a: "Nous vous le disons simplement, en expliquant pourquoi. Il arrive aussi que la meilleure recommandation soit de ne rien changer pour le moment.",
  },
  {
    q: "Que faites-vous de mes informations ?",
    a: "Elles servent uniquement à étudier votre demande et à vous répondre. Elles ne sont ni revendues ni utilisées pour autre chose. Le détail figure dans notre politique de confidentialité.",
  },
];

export default function FirstLookPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Premier aperçu", path: "/premier-apercu" }]}
        label="Premier aperçu · Sans engagement"
        size="lg"
        lines={[
          { text: "Montrez-nous votre entreprise." },
          { accent: "Nous vous montrerons d'abord ce que nous changerions." },
        ]}
        lead="Avant de vous demander de nous faire confiance, montrons-nous utiles. Présentez-nous votre activité : si le projet s'y prête, nous vous montrons concrètement une première piste d'amélioration, avant toute prestation payante."
      >
        <OutreachNotice />
      </PageHero>

      <Section tone="ink-2" labelledBy="formulaire-titre" className="scroll-mt-[var(--header-h)]" id="formulaire">
        <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
              <ul className="space-y-3">
                {promises.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-fg">
                    <Check className="size-4 text-accent" />
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-12 border-t border-line pt-8">
                <p className="label text-fg-3">Ce que nous pouvons regarder</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {reviewed.map((r) => (
                    <li key={r} className="rounded-full border border-line px-3.5 py-1.5 text-[0.875rem] text-fg-2">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 border-t border-line pt-8">
                <p className="label text-fg-3">Ce que vous pouvez recevoir</p>
                <ul className="mt-5 space-y-2.5">
                  {firstLookOutputs.map((o) => (
                    <li key={o} className="font-serif text-[1.25rem] leading-snug text-fg">
                      {o}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[0.875rem] leading-relaxed text-fg-3">
                  Le format dépend de votre activité : nous ne le fixons pas avant de
                  l&apos;avoir regardée. Ce n&apos;est pas un travail complet réalisé
                  gratuitement, mais de quoi décider en connaissance de cause.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <h2 id="formulaire-titre" className="display-sm">
              Présentez-nous votre activité
            </h2>
            <p className="mt-3 text-fg-2">
              Deux minutes suffisent. Vous pouvez aussi écrire directement à{" "}
              <a href={`mailto:${site.email}`} className="text-fg underline underline-offset-4">
                {site.email}
              </a>
              .
            </p>
            <div className="mt-10">
              <FirstLookForm />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="paper" id="message" labelledBy="message-titre" className="scroll-mt-[var(--header-h)]">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>Vous avez reçu un message d&apos;AMYN ?</Label>
            </div>
            <Heading
              id="message-titre"
              size="md"
              className="mt-8"
              lines={[{ text: "Voici pourquoi," }, { accent: "en toute transparence." }]}
            />
          </div>
          <div className="prose-amyn space-y-5 text-fg-2 lg:col-span-6 lg:col-start-7">
            <p data-reveal>
              Il nous arrive de contacter des entreprises lorsque des informations
              publiques — leur site, leur fiche d&apos;établissement, leurs pages en
              ligne — laissent penser qu&apos;une amélioration digitale pourrait leur
              être utile.
            </p>
            <p data-reveal style={delay(60)}>
              Nous n&apos;utilisons que des informations publiées par l&apos;entreprise
              elle-même ou disponibles dans les annuaires publics d&apos;entreprises.
              Nous n&apos;avons accès à aucune donnée privée, et nous écrivons à une
              adresse professionnelle.
            </p>
            <p data-reveal style={delay(120)}>
              Ce message ne vous engage à rien. Si vous ne souhaitez plus être
              contacté, répondez simplement « stop » ou écrivez à{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a> : votre demande est
              enregistrée et respectée.
            </p>
            <p data-reveal style={delay(180)}>
              Le détail de ce traitement figure dans notre{" "}
              <Link href="/confidentialite#prospection">politique de confidentialité</Link>.
            </p>
          </div>
        </Container>
      </Section>

      <Faq items={questions} />
    </>
  );
}
