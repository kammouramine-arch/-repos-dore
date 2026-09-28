import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Layout";
import { ProjectCard } from "@/components/work/ProjectCard";
import { CONCEPT_NOTICE, projects } from "@/lib/projects";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Réalisations",
  description:
    "Concepts de sites, de réservation, de suivi des demandes et d'accueil client créés par AMYN pour six métiers. Des démonstrations, présentées comme telles.",
  path: "/realisations",
});

export default function WorkPage() {
  const [featured, ...rest] = projects;
  // Nombre impair : le dernier concept passe en pleine largeur plutôt que
  // de rester seul sur sa ligne.
  const last = rest.length % 2 === 1 ? rest.pop() : undefined;

  return (
    <>
      <PageHero
        crumbs={[{ name: "Réalisations", path: "/realisations" }]}
        label="Concepts · Démonstrations"
        lines={[{ text: "Six métiers." }, { accent: "Six univers." }]}
        lead="Chaque concept part d'un métier et d'un vrai problème. Le site, et l'outil qui l'accompagne."
      >
        <p className="max-w-xl rounded-[var(--radius-md)] border border-[rgb(242_238_230/0.12)] bg-[rgb(242_238_230/0.03)] px-5 py-4 text-[0.875rem] text-bone-3">
          {CONCEPT_NOTICE} Aucun résultat n&apos;est cité.
        </p>
      </PageHero>

      <Section spacing="none" className="pb-24 sm:pb-32">
        <Container>
          <ProjectCard project={featured} layout="wide" headingLevel="h2" eager />
          <div className="mt-16 grid gap-16 md:grid-cols-2 md:gap-8 lg:gap-10">
            {rest.map((project) => (
              <ProjectCard key={project.slug} project={project} headingLevel="h2" />
            ))}
          </div>
          {last && (
            <div className="mt-16 md:mt-20">
              <ProjectCard project={last} layout="wide" headingLevel="h2" />
            </div>
          )}
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
