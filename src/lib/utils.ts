import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Slug ASCII sûr pour les URL (retire les accents français). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function initials(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .map((p) => p!.trim()[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || '?';
}

export function fullName(
  first?: string | null,
  last?: string | null,
  company?: string | null,
): string {
  const person = [first, last].filter(Boolean).join(' ').trim();
  if (person && company) return `${person} — ${company}`;
  return person || company || 'Client';
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** Retire les valeurs undefined d'un objet (utile pour les updates Prisma). */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
