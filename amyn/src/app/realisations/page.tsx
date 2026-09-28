import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Layout";
import { ProjectCard } from "@/components/work/ProjectCard";
import { CONCEPT_NOTICE, KIND_LABEL, projects } from "@/lib/projects";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Réalisations",
  description:
    "Concepts de sites, de réservation, de suivi des demandes et d'onboarding créés par AMYN pour six métiers. Des démonstrations présentées comme telles.",
  path: "/realisations",
});

export default function WorkPage() {
  const [featured, ...rest] = projects;
  const kinds = Array.from(new Set(projects.map((p) => p.kind)));

  return (
    <>
      <PageHero
        crumbs={[{ name: "Réalisations", path: "/realisations" }]}
        label="Réalisations"
        lines={[{ text: "Six métiers," }, { accent: "six façons de répondre." }]}
        lead="Chaque projet part d'un métier et d'un problème précis, puis montre la direction que nous proposerions : le site, et l'outil qui l'accompagne quand il est utile."
      >
        <div className="rounded-[var(--radius-sm)] border border-line px-5 py-4 text-[0.9375rem] text-fg-2 sm:max-w-2xl">
          <span className="label mr-2 text-accent">
            {kinds.map((k) => KIND_LABEL[k]).join(" · ")}
          </span>
          {CONCEPT_NOTICE} Aucun résultat n&apos;est cité : un chiffre ne sera publié
          que pour un projet client réel, vérifié et autorisé.
        </div>
      </PageHero>

      <Section spacing="tight" className="!pt-4">
        <Container>
          <ProjectCard project={featured} layout="wide" headingLevel="h2" />

          <div className="mt-24 grid gap-x-10 gap-y-24 md:grid-cols-2 lg:gap-x-14">
            {rest.map((project) => (
              <ProjectCard key={project.slug} project={project} headingLevel="h2" />
            ))}
          </div>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
