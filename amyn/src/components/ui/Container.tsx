import type { ReactNode } from "react";

/** Gouttières du site. Une seule largeur de contenu, partout. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[86rem] px-6 sm:px-8 lg:px-14 ${className}`}
    >
      {children}
    </div>
  );
}
