/**
 * Le logo AMYN, en typographie pure : net à toutes les tailles, instantané
 * au chargement, lisible par les moteurs. Le point laiton est la seule
 * touche de couleur.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.18em] ${className}`}>
      <span className="font-sans text-[1.05rem] font-semibold uppercase leading-none tracking-[0.3em] text-fg">
        Amyn
      </span>
      <span aria-hidden className="size-[5px] translate-y-[-1px] rounded-full bg-accent" />
    </span>
  );
}
