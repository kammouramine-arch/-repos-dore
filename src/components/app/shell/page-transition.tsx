'use client';

import { usePathname } from 'next/navigation';

/**
 * Entrée de page : fondu + légère montée à chaque changement de route, la
 * même signature que `Enter` dans l'application iOS. Rejoué par la clé.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in-up">
      {children}
    </div>
  );
}
