import raw from './brand.json';

/**
 * Single source of truth for the working brand. Renaming the product means editing
 * `brand.json` only — app.config.ts and every screen read from here, and no brand
 * string is hardcoded anywhere else.
 */
export const brand = raw as {
  name: string;
  shortName: string;
  tagline: string;
  scheme: string;
  slug: string;
  bundleIdentifier: string;
  androidPackage: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  /** How the assistant refers to itself in conversation. */
  aiName: string;
};

export type Brand = typeof brand;
