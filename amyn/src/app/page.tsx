import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Grain } from "@/components/ui/Grain";

/**
 * ÉCRAN DE VÉRIFICATION — provisoire.
 * Il sert uniquement à contrôler que les couleurs, les polices et les
 * boutons sont bien en place. Il sera remplacé par le HERO à l'étape suivante.
 */
export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center">
      <Grain />

      <Container>
        <p className="eyebrow text-gold">Web &amp; Growth</p>

        <h1 className="display mt-8 text-[clamp(3rem,11vw,9rem)] uppercase">
          <span className="text-metal">Amyn</span>
        </h1>

        <div className="rule-gold mt-10 h-px w-full max-w-md" />

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-bone-dim">
          Fondations posées : noir profond, blanc cassé, or métallique,
          typographies et boutons. Le HERO arrive à l&apos;étape suivante.
        </p>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button href="#">Parler à AMYN</Button>
          <Button href="#" variant="ghost" arrow={false}>
            Découvrir nos services
          </Button>
        </div>
      </Container>
    </main>
  );
}
