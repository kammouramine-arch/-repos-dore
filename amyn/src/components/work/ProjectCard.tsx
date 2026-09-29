import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/Icons";
import { BrowserShot, PhoneShot } from "@/components/visuals/Shots";
import type { Locale } from "@/lib/i18n/config";
import { projectPath } from "@/lib/i18n/routes";
import { KIND_LABELS, type Project } from "@/lib/projects";

/**
 * Une réalisation, présentée comme une vitrine : le site en grand, l'écran
 * mobile ou l'outil au premier plan, la nature du projet toujours visible.
 * Toute la carte est cliquable ; elle se soulève au survol.
 */
export function ProjectCard({
  locale,
  project,
  layout = "stacked",
  headingLevel: H = "h3",
  eager = false,
}: {
  locale: Locale;
  project: Project;
  layout?: "stacked" | "wide";
  headingLevel?: "h2" | "h3";
  eager?: boolean;
}) {
  const href = projectPath(project.slug, locale);
  const wide = layout === "wide";

  return (
    <article data-reveal className="group relative">
      <Link href={href} className="block rounded-[1.25rem] focus-visible:outline-offset-8">
        <div
          className={`lift-card relative overflow-hidden rounded-[1.25rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.06),rgb(242_238_230/0.01))] ${
            wide ? "px-5 pt-10 sm:px-12 sm:pt-16" : "px-5 pt-8 sm:px-8 sm:pt-10"
          }`}
        >
          {/* Lumière de la marque, derrière les écrans. */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-60 transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: `radial-gradient(70% 60% at 50% 100%, ${project.palette.accent}33, transparent 70%)` }}
          />
          <div className="relative transition-transform duration-[900ms] ease-[var(--ease-out)] group-hover:-translate-y-2">
            <BrowserShot
              id={`site-${project.slug}`}
              locale={locale}
              eager={eager}
              sizes={wide ? "(min-width: 1024px) 70vw, 92vw" : "(min-width: 768px) 42vw, 92vw"}
              className={`${wide ? "w-[82%]" : "w-[86%]"} rounded-b-none border-b-0`}
            />
          </div>
          <div
            className={`absolute bottom-0 right-[4%] transition-transform duration-[900ms] ease-[var(--ease-spring)] group-hover:-translate-y-5 ${
              wide ? "w-[22%]" : "w-[27%]"
            }`}
          >
            <PhoneShot id={`mobile-${project.slug}`} locale={locale} sizes="(min-width: 768px) 14vw, 28vw" className="translate-y-[18%]" />
          </div>
        </div>

        <div className={`mt-6 flex items-start justify-between gap-6 ${wide ? "sm:mt-8" : ""}`}>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="label rounded-full border border-gold/40 px-2.5 py-1 text-[0.6875rem] text-gold">
                {KIND_LABELS[locale][project.kind]}
              </span>
              <span className="label text-bone-3">{project.sector}</span>
            </div>
            <H className={`mt-4 font-semibold tracking-[-0.04em] text-bone ${wide ? "text-[clamp(1.9rem,3.6vw,3.2rem)]" : "text-[clamp(1.6rem,2.4vw,2.2rem)]"} leading-none`}>
              {project.brand}
            </H>
            <p className="mt-3 max-w-xl text-bone-2">{project.summary}</p>
          </div>
          <span
            aria-hidden
            className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-full border border-[rgb(242_238_230/0.18)] text-bone-2 transition-[background-color,color,border-color,transform] duration-500 ease-[var(--ease-spring)] group-hover:rotate-45 group-hover:border-gold group-hover:bg-gold group-hover:text-ink sm:flex"
          >
            <ArrowUpRight className="size-5" />
          </span>
        </div>
      </Link>
    </article>
  );
}
