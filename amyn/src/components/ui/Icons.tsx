/**
 * Les quelques icônes du site, dessinées au trait fin. En SVG inline : pas
 * de bibliothèque, pas de requête, et elles prennent la couleur du texte.
 */

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowRight({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

export function ArrowUpRight({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
    </svg>
  );
}

export function Plus({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <path d="M8 2.5v11M2.5 8h11" />
    </svg>
  );
}

export function Check({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <path d="m3 8.5 3.2 3L13 4.5" />
    </svg>
  );
}

export function Mail({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
      <path d="m2.5 4.5 5.5 4 5.5-4" />
    </svg>
  );
}
