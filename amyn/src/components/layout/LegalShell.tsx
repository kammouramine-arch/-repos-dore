import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";

/**
 * Gabarit des pages légales.
 *
 * Volontairement nu : pas d'animation, pas de rideau d'entrée. Ces pages se
 * lisent, elles ne se contemplent pas — et un visiteur qui cherche une
 * mention légale n'a aucune envie d'attendre une intro.
 */
export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader />

      <main className="py-20 sm:py-28">
        <Container>
          <h1 className="display max-w-3xl text-[clamp(1.8rem,4.5vw,3.5rem)] uppercase">
            {title}
          </h1>
          <div className="mt-14 max-w-2xl space-y-10">{children}</div>
        </Container>
      </main>

      <Footer />
    </>
  );
}

/** Un bloc de la page, avec son intitulé. */
export function LegalBlock({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="eyebrow text-gold">{heading}</h2>
      <div className="mt-4 space-y-2 text-[0.95rem] leading-[1.75] text-bone-dim">
        {children}
      </div>
    </section>
  );
}

/**
 * Emplacement à remplir.
 *
 * Aucune information légale n'est inventée : chaque donnée manquante est
 * affichée comme telle. C'est visible, et c'est voulu — tant qu'il en reste
 * une, la page ne doit pas être mise en ligne.
 */
export function ToFill({ children }: { children: ReactNode }) {
  return (
    <p className="text-bone-mute">
      <span className="mr-2 rounded border border-gold/30 px-1.5 py-0.5 font-display text-[0.6rem] uppercase tracking-[0.14em] text-gold">
        À compléter
      </span>
      {children}
    </p>
  );
}
