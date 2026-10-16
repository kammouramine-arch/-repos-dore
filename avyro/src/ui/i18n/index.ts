import { useSyncExternalStore } from 'react';
import { french } from './fr';
export const LOCALES = { en: { direction: 'ltr', available: true }, fr: { direction: 'ltr', available: true }, es: { direction: 'ltr', available: false }, de: { direction: 'ltr', available: false }, it: { direction: 'ltr', available: false }, ar: { direction: 'rtl', available: false } } as const;
export type UiLanguage = 'en' | 'fr';
const systemLanguage = (): UiLanguage => Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr') ? 'fr' : 'en';
let language = systemLanguage();
const listeners = new Set<() => void>();
export function setUiLanguage(value: 'system' | UiLanguage) { language = value === 'system' ? systemLanguage() : value; listeners.forEach(listener => listener()); }
/** The interface language right now, for code outside React. */
export function currentUiLanguage(): UiLanguage { return language; }
export function useUiLanguage() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => language); }
/** Static interface copy only. Addresses, place names and user content are never translated. */
export function t(text: string): string { return language === 'fr' ? french[text] ?? text : text; }
