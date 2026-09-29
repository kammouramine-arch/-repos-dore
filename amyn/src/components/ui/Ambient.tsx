import { AmbientCanvas } from "./AmbientCanvas";

/**
 * Fond du site : un noir chaud éclairé comme un studio — trois nappes de
 * lumière diffuse — puis le « système vivant » (interfaces, flux,
 * poussière de lumière, voir AmbientCanvas), sous un voile de grain et de
 * vignettage. Le fil AMYN se trace avec la lecture. Sans JavaScript, le
 * fond reste la lumière de studio ; avec « moins d'animations », le
 * système est dessiné une fois, immobile.
 */
export function Ambient() {
  return (
    <>
      <div aria-hidden className="ambient">
        <div className="ambient-lights" />
        <AmbientCanvas />
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
