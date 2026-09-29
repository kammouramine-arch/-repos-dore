/**
 * Fond du site : un noir chaud éclairé comme un studio — trois nappes de
 * lumière diffuse, un vignettage, du grain — et le fil AMYN qui se trace
 * avec la lecture. Purement décoratif, sans JavaScript : les mouvements
 * sont en CSS et s'arrêtent si le visiteur a demandé moins d'animations.
 */
export function Ambient() {
  return (
    <>
      <div aria-hidden className="ambient">
        <div className="ambient-lights" />
        <div className="ambient-veil" />
      </div>
      <div aria-hidden className="thread hidden xl:block">
        <div className="thread-fill" />
        <div className="thread-dot" />
      </div>
      <div aria-hidden className="cursor-halo" />
    </>
  );
}

/**
 * Lumière locale d'une section : faisceau, halo et, pour les grands
 * moments (hero, appel final), l'horizon éclairé par derrière.
 */
export function Atmosphere({ variant }: { variant: "hero" | "page" | "finale" }) {
  return (
    <div aria-hidden className={`atmos atmos-${variant}`}>
      {variant !== "finale" && <div className="atmos-beam" />}
      <div className="atmos-halo" />
      {variant === "page" ? (
        <div className="horizon" />
      ) : (
        <>
          <div className="eclipse-glow" />
          <div className="eclipse" />
        </>
      )}
    </div>
  );
}
