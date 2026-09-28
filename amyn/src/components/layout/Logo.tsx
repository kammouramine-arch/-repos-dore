/**
 * Identité AMYN.
 *
 * Le symbole : un A plein dont la contre-forme dessine un M — A et M, les
 * deux premières lettres de la marque, en une seule forme. Le point laiton
 * au-dessus du M est le point de départ : ce qu'on regarde d'abord.
 *
 * Le corps prend la couleur du texte (`currentColor`) : le même symbole
 * fonctionne sur fond sombre, sur fond clair, en favicon et en icône.
 */
export function AmynMark({
  className = "size-7",
  accent = "var(--color-gold)",
}: {
  className?: string;
  accent?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <path
        fillRule="evenodd"
        d="M24 5 44 42H33.5L28 27.5 24 34 20 27.5 14.5 42H4L24 5Z"
        fill="currentColor"
      />
      <circle cx="24" cy="19.5" r="2.9" fill={accent} />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`group/logo inline-flex items-center gap-2.5 text-fg ${className}`}>
      <AmynMark className="size-[26px] transition-transform duration-700 ease-[var(--ease-spring)] group-hover/logo:-rotate-6 group-hover/logo:scale-110" />
      <span className="text-[1rem] font-semibold uppercase leading-none tracking-[0.32em]">Amyn</span>
    </span>
  );
}
