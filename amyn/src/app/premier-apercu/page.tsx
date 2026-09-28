import Link from "next/link";
import { FirstLookForm, OutreachNotice } from "@/components/forms/FirstLookForm";
import { Faq } from "@/components/home/Faq";
import { firstLookOutputs } from "@/components/home/FirstLook";
import { PageHero } from "@/components/layout/PageHero";
import { Check } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Recevoir un premier aperçu",
  description:
    "Présentez-nous votre entreprise et votre projet. Si le projet s'y prête, nous vous montrons une première piste concrète avant toute prestation payante. Sans engagement.",
  path: "/premier-apercu",
});

const promises = ["Sans engagement", "Aucune obligation d'achat", "Réponse d'une personne, pas d'un robot"];

const questions = [
  {
    q: "Est-ce vraiment sans engagement ?",
    a: "Oui. Envoyer ce formulaire ne vous engage à rien, recevoir une première piste non plus. Si vous voulez aller plus loin, nous vous proposons un devis ; vous restez libre de ne pas y donner suite.",
  },
  {
    q: "Pourquoi ne demandez-vous pas mon budget ?",
    a: "Parce qu'un chiffre donné trop tôt fausse la discussion. Nous préférons comprendre votre besoin d'abord ; le devis vient ensuite, avec un périmètre clair.",
  },
  {
    q: "Qu'est-ce que je vais recevoir ?",
    a: "Selon votre situation : une direction de page d'accueil, une courte analyse, une piste pour vos réservations ou vos demandes… Ce n'est pas un projet réalisé gratuitement, mais de quoi décider en connaissance de cause.",
  },
  {
    q: "Que faites-vous de mes informations ?",
    a: "Elles servent uniquement à étudier votre demande et à vous répondre. Elles ne sont ni revendues ni utilisées pour autre chose.",
  },
];

/**
 * Le seul point de contact du site. Tous les appels à l'action y mènent ;
 * l'ancienne page /contact y redirige.
 */
export default function FirstLookPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Premier aperçu", path: "/premier-apercu" }]}
        label="Premier aperçu · Sans engagement"
        lines={[{ text: "Montrez-nous" }, { text: "votre", accent: "entreprise." }]}
        lead="Parlez-nous de votre activité et de votre projet. On vous montre d'abord ce que nous changerions."
      >
        <OutreachNotice />
      </PageHero>

      <Section spacing="none" id="formulaire" labelledBy="formulaire-titre" className="scroll-mt-[var(--header-h)] pb-24 sm:pb-32">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <aside className="order-2 lg:order-1 lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
              <h2 id="formulaire-titre" className="sr-only">
                Formulaire de premier aperçu
              </h2>
              <ul className="space-y-3">
                {promises.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-bone">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[rgb(198_167_106/0.15)]">
                      <Check className="size-3.5 text-gold" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-10 border-t border-[rgb(242_238_230/0.1)] pt-8">
                <p className="label text-bone-3">Ce que vous pouvez recevoir</p>
                <ul className="mt-5 space-y-2">
                  {firstLookOutputs.map((o) => (
                    <li key={o} className="font-serif text-[1.3rem] italic leading-snug text-bone-2">
                      {o}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-10 text-[0.9375rem] text-bone-3">
                Vous préférez écrire ?{" "}
                <a href={`mailto:${site.email}`} className="text-bone underline underline-offset-4">
                  {site.email}
                </a>
              </p>
            </div>
          </aside>

          <div className="order-1 lg:order-2 lg:col-span-8">
            <div className="rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] backdrop-blur-sm sm:p-10">
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
            <Heading id="message-titre" size="md" className="mt-8" lines={[{ text: "Voici pourquoi," }, { accent: "en toute transparence." }]} />
          </div>
          <div className="prose-amyn space-y-5 text-fg-2 lg:col-span-6 lg:col-start-7">
            <p data-reveal>
              Nous contactons parfois des entreprises quand leurs informations publiques —
              site, fiche d&apos;établissement, pages en ligne — laissent penser qu&apos;une
              amélioration pourrait leur être utile.
            </p>
            <p data-reveal style={delay(60)}>
              Nous n&apos;utilisons que ce que l&apos;entreprise publie elle-même ou ce qui figure
              dans les annuaires publics, et nous écrivons à une adresse professionnelle.
            </p>
            <p data-reveal style={delay(120)}>
              Vous ne souhaitez plus être contacté ? Répondez « stop » ou écrivez à{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>. C&apos;est enregistré et
              respecté. Détails dans la{" "}
              <Link href="/confidentialite#prospection">politique de confidentialité</Link>.
            </p>
          </div>
        </Container>
      </Section>

      <Faq items={questions} />
    </>
  );
}
