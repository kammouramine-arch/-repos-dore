import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { principles } from "@/lib/method";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "À propos",
  description:
    "AMYN est un studio digital qui conçoit des sites, des applications et des outils autour de la façon dont chaque entreprise fonctionne. Notre approche et nos exigences.",
  path: "/a-propos",
});

/**
 * À propos — ce qu'est AMYN, sans histoire inventée : ni date de création,
 * ni équipe fictive, ni chiffres. Une philosophie et des exigences.
 */
export default function AboutPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "À propos", path: "/a-propos" }]}
        label="À propos"
        lines={[{ text: "Un studio digital" }, { accent: "au service de la façon dont vous travaillez." }]}
        lead="AMYN conçoit des sites, des applications et des outils pour les entreprises qui veulent autre chose qu'une présence digitale générique : une solution qui colle à leur activité réelle."
      />

      <Section tone="ink-2" labelledBy="philosophie-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>Philosophie</Label>
            </div>
            <Heading
              id="philosophie-titre"
              size="md"
              className="mt-8"
              lines={[{ text: "L'outil vient après" }, { accent: "la compréhension." }]}
            />
          </div>
          <div className="prose-amyn lead space-y-6 text-fg-2 lg:col-span-6 lg:col-start-7">
            <p data-reveal>
              La plupart des entreprises n&apos;ont pas besoin de « plus de digital ».
              Elles ont besoin que les demandes n&apos;attendent plus, que les
              réservations se prennent seules, que les nouveaux clients sachent quoi
              faire, que leur travail soit enfin bien montré.
            </p>
            <p data-reveal style={delay(80)}>
              C&apos;est pour cela que nous commençons toujours par regarder comment
              l&apos;entreprise fonctionne vraiment. Le site, l&apos;application ou
              l&apos;outil ne viennent qu&apos;ensuite — et seulement ce qui est utile.
            </p>
            <p data-reveal style={delay(160)}>
              Nous préférons montrer plutôt que promettre. C&apos;est le sens du premier
              aperçu : avant de vous demander de nous faire confiance, nous vous
              montrons concrètement une première piste, quand le projet s&apos;y prête.
            </p>
          </div>
        </Container>
      </Section>

      <Section labelledBy="relation-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>La relation</Label>
            </div>
            <Heading
              id="relation-titre"
              size="md"
              className="mt-8"
              lines={[{ text: "Travailler avec nous," }, { accent: "concrètement." }]}
            />
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {[
              ["Un interlocuteur direct", "Vous échangez avec les personnes qui conçoivent et construisent votre projet."],
              ["Un vocabulaire simple", "Nous expliquons les choix techniques en français courant, et vous décidez en connaissance de cause."],
              ["Un périmètre écrit", "Ce qui est inclus, ce qui ne l'est pas, et ce que nous attendons de vous : tout est dans le devis."],
              ["Une suite, si vous le souhaitez", "Après la mise en ligne, un accompagnement peut être prévu. Il n'est jamais imposé."],
            ].map(([term, text], i) => (
              <div key={term} data-reveal style={delay((i % 2) * 80)}>
                <dt className="title">{term}</dt>
                <dd className="mt-3 text-fg-2">{text}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section tone="paper" labelledBy="exigences-titre">
        <Container>
          <div data-reveal="fade">
            <Label>Exigences</Label>
          </div>
          <Heading
            id="exigences-titre"
            size="md"
            className="mt-8 max-w-3xl"
            lines={[{ text: "Le niveau de qualité" }, { accent: "que nous nous imposons." }]}
          />
          <ul className="mt-14 grid gap-px border-y border-line bg-line sm:-mx-6 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <li key={p.title} className="bg-canvas py-8 sm:px-6">
                <div data-reveal style={delay((i % 3) * 70)}>
                  <span className="label text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <p className="title mt-5">{p.title}</p>
                  <p className="mt-3 text-[0.9375rem] text-fg-2">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
