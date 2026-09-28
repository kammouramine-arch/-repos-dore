import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/Icons";
import { Tag } from "@/components/ui/Layout";
import { ConceptWindow } from "@/components/visuals/ServiceVisual";
import { KIND_LABEL, projectPath, type Project } from "@/lib/projects";
import { serviceBySlug } from "@/lib/services";

/**
 * Un projet présenté comme une petite étude de cas : la nature du projet
 * (toujours visible), le contexte, le problème, la direction.
 */
export function ProjectCard({
  project,
  layout = "stacked",
  headingLevel: H = "h3",
}: {
  project: Project;
  layout?: "stacked" | "wide";
  headingLevel?: "h2" | "h3";
}) {
  const href = projectPath(project.slug);
  const services = project.services.map((slug) => serviceBySlug(slug)!.short);

  return (
    <article data-reveal className="group">
      <Link href={href} tabIndex={-1} aria-hidden className="block">
        <div className="transition-transform duration-700 ease-[var(--ease-out)] group-hover:-translate-y-1">
          <ConceptWindow project={project} />
        </div>
      </Link>

      <div
        className={
          layout === "wide"
            ? "mt-8 grid gap-8 lg:grid-cols-12 lg:gap-12"
            : "mt-7"
        }
      >
        <div className={layout === "wide" ? "lg:col-span-5" : undefined}>
          <div className="flex flex-wrap items-center gap-3">
            <Tag>{KIND_LABEL[project.kind]}</Tag>
            <span className="label text-fg-3">{project.sector}</span>
          </div>
          <H className="display-sm mt-5">
            <Link href={href} className="link-line">
              {project.brand}
            </Link>
          </H>
          <p className="mt-3 max-w-xl text-fg-2">{project.summary}</p>
        </div>

        <dl
          className={
            layout === "wide"
              ? "grid gap-6 text-[0.9375rem] sm:grid-cols-2 lg:col-span-7"
              : "mt-6 grid gap-5 text-[0.9375rem]"
          }
        >
          <div>
            <dt className="label text-fg-3">Problème</dt>
            <dd className="mt-2 text-fg-2">{project.problem}</dd>
          </div>
          <div>
            <dt className="label text-fg-3">Direction</dt>
            <dd className="mt-2 text-fg-2">{project.direction}</dd>
          </div>
          {layout === "wide" && (
            <div className="sm:col-span-2">
              <dt className="label text-fg-3">Services mobilisés</dt>
              <dd className="mt-2 text-fg-2">{services.join(" · ")}</dd>
            </div>
          )}
        </dl>
      </div>

      <Link
        href={href}
        className="mt-7 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] text-fg"
      >
        <span className="link-line">Voir le concept</span>
        <ArrowUpRight className="nudge-up size-4" />
        <span className="sr-only"> {project.brand}</span>
      </Link>
    </article>
  );
}
