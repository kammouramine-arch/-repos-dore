import { Container } from "@/components/ui/Container";

/**
 * La grille de composition à 4 colonnes, à 4,5 % d'opacité.
 *
 * On ne la voit pas ; on sent que tout est aligné. Elle traverse le site
 * entier pour donner l'unité d'une même planche imprimée.
 */
export function GridLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Container className="h-full">
        <div className="hidden h-full grid-cols-4 sm:grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-l border-bone/[0.045] last:border-r" />
          ))}
        </div>
      </Container>
    </div>
  );
}
