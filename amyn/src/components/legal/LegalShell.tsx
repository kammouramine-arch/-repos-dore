import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Layout";
import { LEGAL_UPDATED } from "@/lib/legal";

/**
 * Gabarit des pages légales : une colonne de lecture, des intitulés
 * numérotés, aucune animation d'apparition — ces pages se lisent.
 */
export function LegalShell({
  title,
  path,
  intro,
  children,
}: {
  title: string;
  path: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero
        crumbs={[{ name: title, path }]}
        label={`Dernière mise à jour : ${LEGAL_UPDATED}`}
        size="lg"
        lines={[{ text: title }]}
        lead={intro}
      />
      <Section spacing="none" className="pb-24 sm:pb-32">
        <Container>
          <div className="prose-amyn max-w-3xl space-y-14 text-fg-2 [counter-reset:legal]">{children}</div>
        </Container>
      </Section>
    </>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-h)+2rem)] border-t border-line pt-10 [counter-increment:legal]">
      <h2 className="display-sm text-fg before:label before:mr-4 before:align-middle before:text-accent before:content-[counter(legal,decimal-leading-zero)]">
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Information légale manquante. Visible volontairement : une page qui en
 * contient ne doit pas être publiée en l'état.
 */
export function ToComplete({ label }: { label: string }) {
  return (
    <span className="rounded-[var(--radius-xs)] border border-dashed border-accent/60 px-1.5 py-0.5 font-mono text-[0.8125rem] text-accent">
      [À COMPLÉTER — {label}]
    </span>
  );
}

/** Une ligne « intitulé : valeur », avec emplacement si la valeur manque. */
export function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="text-fg">{label} :</span> {value ?? <ToComplete label={label} />}
    </p>
  );
}
