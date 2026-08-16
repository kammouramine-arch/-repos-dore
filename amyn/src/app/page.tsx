import { Header } from "@/components/layout/Header";
import { IntroGate } from "@/components/layout/IntroGate";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Services } from "@/components/sections/Services";
import { Solution } from "@/components/sections/Solution";

export default function Home() {
  return (
    <IntroGate>
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Services />
        {/* Les sections suivantes viendront s'ajouter ici, une par une. */}
      </main>
    </IntroGate>
  );
}
