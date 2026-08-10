/**
 * Voile de grain fixe posé au-dessus de tout le site.
 *
 * Invisible consciemment, mais c'est lui qui empêche les grands aplats noirs
 * de faire « plat » et donne la sensation de matière d'un site haut de gamme.
 */
export function Grain() {
  return (
    <div
      aria-hidden
      className="grain-layer pointer-events-none fixed inset-0 z-50 mix-blend-soft-light"
    />
  );
}
