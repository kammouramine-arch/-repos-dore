import { Header } from "@/components/layout/Header";
import { IntroGate } from "@/components/layout/IntroGate";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";

export default function Home() {
  return (
    <IntroGate>
      <Header />
      <main>
        <Hero />
        <Problem />
        {/* Les sections suivantes viendront s'ajouter ici, une par une. */}
      </main>
    </IntroGate>
  );
}
