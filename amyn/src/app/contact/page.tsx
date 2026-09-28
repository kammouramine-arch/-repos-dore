import Link from "next/link";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { PageHero } from "@/components/layout/PageHero";
import { Mail } from "@/components/ui/Icons";
import { Container, Section } from "@/components/ui/Layout";
import { method } from "@/lib/method";
import { pageMetadata } from "@/lib/seo";
import { cta, site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Parler de votre projet",
  description:
    "Décrivez votre projet de site, d'application ou d'outil digital : nous revenons vers vous pour préparer un premier échange et un devis. Sans engagement.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Contact", path: "/contact" }]}
        label="Parler de votre projet"
        size="lg"
        lines={[{ text: "Vous avez un projet ?" }, { accent: "Parlons-en concrètement." }]}
        lead="Quelques questions pour comprendre votre besoin et préparer un premier échange utile. Chaque projet est ensuite cadré et chiffré sur devis, avant tout engagement."
      />

      <Section tone="ink-2" labelledBy="projet-titre">
        <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <h2 id="projet-titre" className="sr-only">
              Formulaire de projet
            </h2>
            <ProjectForm />
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="space-y-12 lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
              <div>
                <p className="label text-fg-3">Pas encore de projet précis ?</p>
                <p className="mt-4 text-fg-2">
                  Commencez par un premier aperçu : montrez-nous votre activité, et nous
                  vous montrons d&apos;abord ce que nous changerions.
                </p>
                <Link
                  href={cta.firstLook.href}
                  className="link-line mt-4 inline-flex min-h-11 items-center text-fg"
                >
                  {cta.firstLook.label} →
                </Link>
              </div>

              <div className="border-t border-line pt-8">
                <p className="label text-fg-3">Et ensuite ?</p>
                <ol className="mt-5 space-y-4">
                  {method.slice(0, 2).map((step) => (
                    <li key={step.number} className="grid grid-cols-[2rem_1fr] gap-3">
                      <span className="label pt-1 text-accent">{step.number}</span>
                      <span>
                        <span className="block text-fg">{step.title}</span>
                        <span className="text-[0.9375rem] text-fg-2">{step.summary}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-line pt-8">
                <p className="label text-fg-3">Par e-mail</p>
                <a
                  href={`mailto:${site.email}`}
                  className="mt-4 inline-flex min-h-11 items-center gap-2.5 text-fg"
                >
                  <Mail className="size-4 text-accent" />
                  <span className="link-line">{site.email}</span>
                </a>
              </div>
            </div>
          </aside>
        </Container>
      </Section>
    </>
  );
}
