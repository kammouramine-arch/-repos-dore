import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LEGAL_UPDATED, LEGAL_UPDATED_EN } from "@/lib/legal";

/**
 * Gabarit des pages légales : une colonne de lecture, des intitulés
 * numérotés, aucune animation d'apparition — ces pages se lisent.
 */
export function LegalShell({
  locale,
  title,
  path,
  intro,
  children,
}: {
  locale: Locale;
  title: string;
  path: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const t = getDictionary(locale);
  const updated = locale === "en" ? `${t.legal.updated}: ${LEGAL_UPDATED_EN}` : `${t.legal.updated} : ${LEGAL_UPDATED}`;
  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: title, path }]}
        label={updated}
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
export function ToComplete({ label, locale = "fr" }: { label: string; locale?: Locale }) {
  return (
    <span className="rounded-[var(--radius-xs)] border border-dashed border-accent/60 px-1.5 py-0.5 font-mono text-[0.8125rem] text-accent">
      [{getDictionary(locale).legal.toComplete} — {label}]
    </span>
  );
}

/** Une ligne « intitulé : valeur », avec emplacement si la valeur manque. */
export function Fact({
  label,
  value,
  locale = "fr",
}: {
  label: string;
  value: string | null;
  locale?: Locale;
}) {
  return (
    <p>
      <span className="text-fg">
        {label}
        {locale === "en" ? ":" : " :"}
      </span>{" "}
      {value ?? <ToComplete label={label} locale={locale} />}
    </p>
  );
}
