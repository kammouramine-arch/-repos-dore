import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ArrowUpRight } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { BrowserShot, PhoneShot } from "@/components/visuals/Shots";
import { CONCEPT_NOTICE, KIND_LABEL, projectBySlug, projectPath, projects } from "@/lib/projects";
import { pageMetadata } from "@/lib/seo";
import { serviceBySlug, servicePath } from "@/lib/services";
import { shot, shotSrc } from "@/lib/visuals";

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

/**
 * Étude de cas : d'abord les écrans, en grand. Ensuite trois phrases —
 * contexte, problème, direction — puis le reste des écrans. La nature du
 * projet (concept) est rappelée en tête et sous les visuels.
 */
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
  const wide = project.screens.filter((id) => shot(id).kind === "browser");
  const phones = project.screens.filter((id) => shot(id).kind === "phone");

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Réalisations", path: "/realisations" },
          { name: project.brand, path: projectPath(project.slug) },
        ]}
        label={
          <span className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">{KIND_LABEL[project.kind]}</span>
            <span>{project.sector}</span>
          </span>
        }
        lines={[{ text: project.brand }]}
        lead={project.summary}
      />

      {/* La vitrine */}
      <Section spacing="none" className="pb-20 sm:pb-28">
        <Container>
          <div
            data-reveal
            className="relative overflow-hidden rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] px-4 pb-0 pt-8 sm:px-12 sm:pt-16"
            style={{ background: `radial-gradient(80% 70% at 50% 100%, ${project.palette.accent}40, transparent 70%), linear-gradient(160deg, rgb(242 238 230 / 0.06), rgb(242 238 230 / 0.01))` }}
          >
            <BrowserShot id={`site-${project.slug}`} eager sizes="(min-width: 1024px) 75vw, 94vw" className="w-[86%] rounded-b-none border-b-0" />
            <div className="absolute bottom-0 right-[3%] w-[24%]">
              <div className="float-b translate-y-[14%]">
                <PhoneShot id={`mobile-${project.slug}`} eager sizes="(min-width: 1024px) 18vw, 26vw" />
              </div>
            </div>
          </div>
          <p className="label mt-5 text-bone-3">{CONCEPT_NOTICE}</p>
        </Container>
      </Section>

      {/* L'étude de cas, en trois phrases */}
      <Section tone="ink-2" labelledBy="etude-titre" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label>Étude de cas</Label>
          </div>
          <Heading id="etude-titre" className="mt-7" lines={[{ text: "Le point de départ," }, { accent: "et la direction." }]} />

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              ["Contexte", project.context],
              ["Problème", project.problem],
              ["Direction", project.direction],
            ].map(([term, text], i) => (
              <div
                key={term}
                data-reveal
                style={delay(i * 90)}
                className="rounded-[1.25rem] border border-[rgb(242_238_230/0.1)] bg-[rgb(242_238_230/0.025)] p-7"
              >
                <p className="label text-gold">{term}</p>
                <p className="mt-4 text-bone-2">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <ul data-reveal className="flex flex-wrap gap-2" aria-label="Fonctionnalités">
              {project.features.map((f) => (
                <li key={f} className="rounded-full border border-[rgb(242_238_230/0.14)] px-4 py-2 text-[0.9375rem] text-bone">
                  {f}
                </li>
              ))}
            </ul>
            <ul data-reveal className="flex flex-wrap gap-2" aria-label="Services mobilisés">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={servicePath(s.slug)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(198_167_106/0.12)] px-4 text-[0.9375rem] text-gold-2 transition-[background-color,transform] hover:bg-[rgb(198_167_106/0.2)] active:scale-95"
                  >
                    <span className="font-mono text-[0.75rem]">{s.number}</span>
                    {s.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* Les autres écrans */}
      <Section labelledBy="ecrans-titre" className="seam">
        <Container>
          <h2 id="ecrans-titre" className="sr-only">
            Écrans du projet
          </h2>
          <div className="grid grid-cols-12 items-end gap-x-4 gap-y-12 sm:gap-x-6">
            {wide.length > 1 && (
              <figure data-reveal className="col-span-12">
                <BrowserShot id={wide[0]} sizes="(min-width: 1024px) 88vw, 94vw" />
                <figcaption className="mt-3 text-[0.875rem] text-bone-3">{shot(wide[0]).alt}</figcaption>
              </figure>
            )}
            {wide.slice(wide.length > 1 ? 1 : 0).map((id) => (
              <figure key={id} data-reveal className={phones.length ? "col-span-12 lg:col-span-8" : "col-span-12"}>
                <BrowserShot id={id} sizes="(min-width: 1024px) 62vw, 94vw" />
                <figcaption className="mt-3 text-[0.875rem] text-bone-3">{shot(id).alt}</figcaption>
              </figure>
            ))}
            {phones.length > 0 && (
              <div className={`grid gap-4 sm:gap-6 ${phones.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${wide.length ? "col-span-12 sm:col-span-8 sm:col-start-3 lg:col-span-4 lg:col-start-auto" : "col-span-12 mx-auto w-full max-w-xl"}`}>
                {phones.map((id, i) => (
                  <figure key={id} data-reveal style={delay(120 + i * 80)} className={phones.length === 1 ? "mx-auto w-[62%]" : ""}>
                    <PhoneShot id={id} sizes="(min-width: 1024px) 15vw, 45vw" />
                    <figcaption className="mt-3 text-[0.8125rem] text-bone-3">{shot(id).alt}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </Container>
      </Section>

      {/* Projet suivant */}
      <Section tone="ink-2" spacing="tight" className="seam">
        <Container>
          <Link href={projectPath(next.slug)} className="group grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <span className="flex items-center gap-6">
              <span className="relative hidden h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-[rgb(242_238_230/0.12)] sm:block">
                <Image src={shotSrc(`site-${next.slug}`)} alt="" fill sizes="160px" quality={70} className="object-cover object-top transition-transform duration-700 group-hover:scale-110" />
              </span>
              <span>
                <span className="label text-bone-3">Concept suivant · {next.sector}</span>
                <span className="display-md mt-2 block text-bone transition-colors group-hover:text-gold-2">{next.brand}</span>
              </span>
            </span>
            <span
              aria-hidden
              className="flex size-14 items-center justify-center rounded-full border border-[rgb(242_238_230/0.18)] text-bone-2 transition-[background-color,color,border-color,transform] duration-500 ease-[var(--ease-spring)] group-hover:rotate-45 group-hover:border-gold group-hover:bg-gold group-hover:text-ink"
            >
              <ArrowUpRight className="size-5" />
            </span>
          </Link>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
