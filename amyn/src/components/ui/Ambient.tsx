/**
 * Fond vivant du site : grille technique, lumières diffuses, grain, et le
 * fil AMYN qui se trace avec la lecture. Purement décoratif, sans
 * JavaScript : les mouvements sont liés au défilement en CSS et s'arrêtent
 * si le visiteur a demandé moins d'animations.
 */
export function Ambient() {
  return (
    <>
      <div aria-hidden className="ambient">
        <div className="ambient-grid" />
        <div className="ambient-light a" />
        <div className="ambient-light b" />
        <div className="ambient-grain" />
      </div>
      <div aria-hidden className="thread hidden xl:block">
        <div className="thread-fill" />
        <div className="thread-dot" />
      </div>
      <div aria-hidden className="cursor-halo" />
    </>
  );
}
