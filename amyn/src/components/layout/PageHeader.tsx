import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * En-tête des pages secondaires (contact, mentions légales…).
 *
 * Volontairement réduit : le nom, et une sortie. Ces pages ne sont pas le
 * récit du site, elles rendent un service — et le visiteur doit toujours
 * pouvoir revenir d'un seul geste, sans dépendre du bouton retour.
 */
export function PageHeader({ back = true }: { back?: boolean }) {
  return (
    <header className="border-b border-bone/10">
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Link href="/" aria-label="AMYN — retour à l'accueil">
          <Wordmark className="text-base sm:text-lg" />
        </Link>

        {back && (
          <Link
            href="/"
            className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-bone-dim transition-colors duration-300 hover:text-gold"
          >
            <span aria-hidden>←</span> Retour
          </Link>
        )}
      </Container>
    </header>
  );
}
