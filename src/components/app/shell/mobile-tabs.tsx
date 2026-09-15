'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/context';
import { isActive, mobileNav } from './nav';

/**
 * Barre d'onglets du web mobile : les cinq onglets de l'application iOS,
 * dans le même ordre, avec le « + » central surélevé.
 */
export function MobileTabs() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md md:hidden"
      aria-label={t.nav.more}
    >
      <ul className="flex items-stretch">
        {mobileNav(t).map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          if (item.primary) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition-transform active:scale-90"
                  aria-label={item.label}
                >
                  <item.icon className="h-6 w-6" aria-hidden />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors',
                  active ? 'text-accent' : 'text-subtle',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className={cn('h-[21px] w-[21px] transition-transform', active && '-translate-y-px scale-105')} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
