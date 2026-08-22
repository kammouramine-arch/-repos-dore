import raw from './brand.json';

/**
 * The product identity, in one place.
 *
 * Every user-visible name, the deep-link scheme, the storage namespace, the store
 * product prefix and the legal links come from `brand.json` — renaming the product is
 * a one-file change, and nothing else in the app hardcodes a product name.
 *
 * `supportEmail`, `privacyUrl` and `termsUrl` are deliberately empty until real ones
 * exist. The app hides a link rather than pointing somewhere that does not exist, and
 * `npm run release:check` refuses to pass while they are unset.
 */
export const brand = raw as {
  name: string;
  shortName: string;
  tagline: string;
  positioning: string;
  scheme: string;
  slug: string;
  bundleIdentifier: string;
  androidPackage: string;
  /** Prefix for on-device storage keys, so two builds never share state. */
  storageNamespace: string;
  /** Prefix for store product ids, e.g. `lifeos.plus.monthly`. */
  productPrefix: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  /** How the assistant refers to itself in conversation. */
  aiName: string;
};

export type Brand = typeof brand;

/** A link is only offered once it actually points somewhere. */
export function brandLink(key: 'privacyUrl' | 'termsUrl'): string | null {
  const value = brand[key];
  return value && value.startsWith('https://') ? value : null;
}

export function supportAddress(): string | null {
  return brand.supportEmail && brand.supportEmail.includes('@') ? brand.supportEmail : null;
}

/** What still has to be filled in before the app can be submitted to a store. */
export function missingBrandConfiguration(): string[] {
  const missing: string[] = [];
  if (!brandLink('privacyUrl')) missing.push('privacyUrl');
  if (!brandLink('termsUrl')) missing.push('termsUrl');
  if (!supportAddress()) missing.push('supportEmail');
  return missing;
}
