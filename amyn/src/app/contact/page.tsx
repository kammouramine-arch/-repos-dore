import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactForm } from "@/components/contact/ContactForm";
import { Container } from "@/components/ui/Container";
import { GridLines } from "@/components/ui/GridLines";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Démarrer mon projet",
  description:
    "Décrivez votre entreprise et votre projet en quelques lignes. Nous revenons vers vous avec une proposition claire.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Démarrer mon projet",
    description:
      "Décrivez votre entreprise et votre projet en quelques lignes. Nous revenons vers vous avec une proposition claire.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader />

      <main className="relative py-20 sm:py-28">
        <GridLines />

        <Container className="relative">
          <div className="flex items-center gap-4">
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">Votre projet</span>
          </div>

          <h1 className="display mt-10 max-w-3xl text-[clamp(1.9rem,5vw,4rem)] uppercase">
            Parlons de{" "}
            <span className="accent text-[1.08em] text-metal">votre projet.</span>
          </h1>

          <p className="mt-8 max-w-xl text-balance text-[0.975rem] leading-[1.75] text-bone-dim sm:text-base">
            Quelques lignes suffisent : votre activité, ce que le site doit
            vous apporter, et ce que vous avez en tête. Nous revenons vers vous
            avec une proposition claire.
          </p>

          <div className="mt-16 max-w-4xl sm:mt-20">
            {/* useSearchParams impose une frontière de suspense : sans elle,
                toute la page basculerait en rendu dynamique. */}
            <Suspense fallback={<div className="h-[32rem]" />}>
              <ContactForm />
            </Suspense>
          </div>

          {contact.email && (
            <p className="mt-16 text-[0.85rem] text-bone-mute sm:mt-20">
              Vous préférez écrire directement ?{" "}
              <a
                href={`mailto:${contact.email}`}
                className="text-bone-dim underline decoration-bone/20 underline-offset-4 transition-colors duration-300 hover:text-gold hover:decoration-gold/50"
              >
                {contact.email}
              </a>
            </p>
          )}
        </Container>
      </main>

      <Footer />
    </>
  );
}
