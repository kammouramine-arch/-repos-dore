'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/context';
import { settingsSections } from './settings-sections';

/**
 * Navigation des paramètres : une colonne sur ordinateur, une rangée
 * défilante sur mobile. Même découpage que « Mon espace » sur iPhone.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav aria-label={t.settings.sections} className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 lg:mx-0 lg:max-w-none lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
        {settingsSections(t).map((section) => {
          const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                  active ? 'bg-accent-soft text-accent-hover' : 'text-muted hover:bg-surface hover:text-ink',
                )}
              >
                <section.icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-subtle')} aria-hidden />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
