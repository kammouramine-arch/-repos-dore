import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Layout";
import { ProjectCard } from "@/components/work/ProjectCard";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { CONCEPT_NOTICES, getProjects } from "@/lib/projects";
import { pageMetadata } from "@/lib/seo";

export function workMetadata(locale: Locale) {
  const t = getDictionary(locale).workPage;
  return pageMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    locale,
    alternates: routeAlternates("work"),
  });
}

export function WorkPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).workPage;
  const [featured, ...rest] = getProjects(locale);
  // Nombre impair : le dernier concept passe en pleine largeur plutôt que
  // de rester seul sur sa ligne.
  const last = rest.length % 2 === 1 ? rest.pop() : undefined;

  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: getUi(locale).nav.work, path: href("work", locale) }]}
        label={t.label}
        lines={t.title}
        lead={t.lead}
      >
        <p className="max-w-xl rounded-[var(--radius-md)] border border-[rgb(242_238_230/0.12)] bg-[rgb(242_238_230/0.03)] px-5 py-4 text-[0.875rem] text-bone-3">
          {CONCEPT_NOTICES[locale]} {t.noResults}
        </p>
      </PageHero>

      <Section spacing="none" className="pb-24 sm:pb-32">
        <Container>
          <ProjectCard locale={locale} project={featured} layout="wide" headingLevel="h2" eager />
          <div className="mt-16 grid gap-16 md:grid-cols-2 md:gap-8 lg:gap-10">
            {rest.map((project) => (
              <ProjectCard key={project.slug} locale={locale} project={project} headingLevel="h2" />
            ))}
          </div>
          {last && (
            <div className="mt-16 md:mt-20">
              <ProjectCard locale={locale} project={last} layout="wide" headingLevel="h2" />
            </div>
          )}
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
