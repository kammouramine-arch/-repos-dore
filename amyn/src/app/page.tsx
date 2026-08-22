import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { IntroGate } from "@/components/layout/IntroGate";
import { Care } from "@/components/sections/Care";
import { FinalCta } from "@/components/sections/FinalCta";
import { Hero } from "@/components/sections/Hero";
import { Pricing } from "@/components/sections/Pricing";
import { Process } from "@/components/sections/Process";
import { Sectors } from "@/components/sections/Sectors";
import { Tailored } from "@/components/sections/Tailored";
import { Visibility } from "@/components/sections/Visibility";
import { Work } from "@/components/sections/Work";

/**
 * Le parcours de la page d'accueil, dans l'ordre où il convainc :
 *
 *   ce que nous faisons → la preuve → pourquoi c'est sur mesure →
 *   pour votre métier → comment ça se passe → combien →
 *   les options → l'entretien → parlons-en.
 *
 * La preuve arrive tout de suite après la promesse : c'est elle qui donne
 * le droit de parler de prix trois sections plus bas.
 */
export default function Home() {
  return (
    <IntroGate>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[80] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:font-display focus:text-[0.7rem] focus:font-semibold focus:uppercase focus:tracking-[0.18em] focus:text-ink"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="contenu">
        <Hero />
        <Work />
        <Tailored />
        <Sectors />
        <Process />
        <Pricing />
        <Visibility />
        <Care />
        <FinalCta />
      </main>
      <Footer />
    </IntroGate>
  );
}
