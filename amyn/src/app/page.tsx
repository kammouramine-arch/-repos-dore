import { Header } from "@/components/layout/Header";
import { IntroGate } from "@/components/layout/IntroGate";
import { Hero } from "@/components/sections/Hero";

export default function Home() {
  return (
    <IntroGate>
      <Header />
      <main>
        <Hero />
        {/* Les sections suivantes viendront s'ajouter ici, une par une. */}
      </main>
    </IntroGate>
  );
}
