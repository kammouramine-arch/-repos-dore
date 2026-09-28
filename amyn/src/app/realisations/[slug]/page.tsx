import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ArrowRight } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, Tag, delay } from "@/components/ui/Layout";
import { ConceptWindow, ServiceVisual } from "@/components/visuals/ServiceVisual";
import { CONCEPT_NOTICE, KIND_LABEL, projectBySlug, projectPath, projects } from "@/lib/projects";
import { pageMetadata } from "@/lib/seo";
import { serviceBySlug, servicePath } from "@/lib/services";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) return {};
  return pageMetadata({
    title: `${project.brand} — ${KIND_LABEL[project.kind].toLowerCase()} ${project.sector.toLowerCase()}`,
    description: `${KIND_LABEL[project.kind]} AMYN : ${project.summary}`,
    path: projectPath(project.slug),
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();

  const index = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(index + 1) % projects.length];
  const services = project.services.map((s) => serviceBySlug(s)!);
  const companion = services.find((s) => s.visual === project.companion);

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Réalisations", path: "/realisations" },
          { name: project.brand, path: projectPath(project.slug) },
        ]}
        label={
          <span className="flex flex-wrap items-center gap-3">
            <Tag>{KIND_LABEL[project.kind]}</Tag>
            <span>{project.sector}</span>
          </span>
        }
        size="lg"
        lines={[{ text: project.brand }]}
        lead={project.summary}
      />

      <Section spacing="none" className="pb-20 sm:pb-28">
        <Container>
          <div data-reveal>
            <ConceptWindow project={project} />
          </div>
          <p className="label mt-5 text-fg-3">{CONCEPT_NOTICE}</p>
        </Container>
      </Section>

      <Section tone="ink-2" labelledBy="etude-titre">
        <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div data-reveal="fade">
              <Label>Étude de cas</Label>
            </div>
            <Heading
              id="etude-titre"
              size="md"
              className="mt-8"
              lines={[{ text: "Le point de départ," }, { accent: "et la direction." }]}
            />
          </div>

          <dl className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {[
              ["Contexte", project.context],
              ["Problème", project.problem],
              ["Direction créative", project.direction],
            ].map(([term, text], i) => (
              <div key={term} data-reveal style={delay(i * 80)} className={i === 2 ? "sm:col-span-2" : undefined}>
                <dt className="label text-fg-3">{term}</dt>
                <dd className="mt-3 text-fg-2">{text}</dd>
              </div>
            ))}
            <div data-reveal>
              <dt className="label text-fg-3">Fonctionnalités</dt>
              <dd className="mt-4">
                <ul className="space-y-2.5">
                  {project.features.map((f) => (
                    <li key={f} className="flex gap-3 text-fg">
                      <span aria-hidden className="mt-[0.8em] h-px w-3 shrink-0 bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div data-reveal style={delay(80)}>
              <dt className="label text-fg-3">Services mobilisés</dt>
              <dd className="mt-4">
                <ul className="space-y-2.5">
                  {services.map((s) => (
                    <li key={s.slug}>
                      <Link href={servicePath(s.slug)} className="link-line hit-area text-fg [--hit-y:5px]">
                        <span className="label mr-2 text-accent">{s.number}</span>
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Container>
      </Section>

      {companion && (
        <Section labelledBy="outil-titre">
          <Container className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <div data-reveal="fade">
                <Label number={companion.number}>{companion.name}</Label>
              </div>
              <Heading
                id="outil-titre"
                size="md"
                className="mt-8"
                lines={[{ text: "Au-delà de la page d'accueil :" }, { accent: "l'outil qui l'accompagne." }]}
              />
              <p data-reveal className="mt-8 text-fg-2">
                {companion.summary}
              </p>
            </div>
            <div data-reveal className="lg:col-span-6 lg:col-start-7">
              <ServiceVisual visual={project.companion} />
              <p className="label mt-4 text-fg-3">Illustration — {companion.name}</p>
            </div>
          </Container>
        </Section>
      )}

      <Section tone="ink-2" spacing="tight">
        <Container>
          <Link href={projectPath(next.slug)} className="group flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <span>
              <span className="label text-fg-3">Concept suivant · {next.sector}</span>
              <span className="display-md mt-3 block">{next.brand}</span>
            </span>
            <span className="flex items-center gap-2 text-fg-2 group-hover:text-fg">
              Voir le concept <ArrowRight className="nudge size-4" />
            </span>
          </Link>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
