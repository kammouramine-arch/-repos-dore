import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { IntroGate } from "@/components/layout/IntroGate";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Services } from "@/components/sections/Services";
import { Care } from "@/components/sections/Care";
import { FinalCta } from "@/components/sections/FinalCta";
import { Pricing } from "@/components/sections/Pricing";
import { Showcase } from "@/components/sections/Showcase";
import { Solution } from "@/components/sections/Solution";

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
        <Problem />
        <Solution />
        <Services />
        <Showcase />
        <Pricing />
        <Care />
        <FinalCta />
      </main>
      <Footer />
    </IntroGate>
  );
}
