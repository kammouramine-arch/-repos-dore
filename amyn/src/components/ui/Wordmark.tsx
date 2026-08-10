/**
 * Le logo AMYN, en typographie pure.
 *
 * Pas d'image : le texte reste net à toutes les tailles, se charge
 * instantanément et reste lisible par Google. L'or n'est pas un aplat mais
 * un dégradé métallique appliqué aux lettres (utilitaire `text-metal`).
 */
export function Wordmark({
  className = "",
  as: Tag = "span",
}: {
  className?: string;
  as?: "span" | "div";
}) {
  return (
    <Tag
      className={`font-display font-semibold uppercase leading-none tracking-[0.22em] text-metal ${className}`}
    >
      Amyn
    </Tag>
  );
}
