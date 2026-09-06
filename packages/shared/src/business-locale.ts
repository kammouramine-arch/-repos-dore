/** Language is a preference; business jurisdiction is separate persisted data. */
export type AppLanguage = 'fr' | 'en';
export type BusinessCountry = 'FR' | 'GB' | 'US';
export interface BusinessLocale {
  language: AppLanguage;
  country: BusinessCountry;
  currency: 'EUR' | 'GBP' | 'USD';
  locale: string;
  timezone: string;
  subdivision?: string;
}
const regions = {
  FR: { currency: 'EUR', timezone: 'Europe/Paris' },
  GB: { currency: 'GBP', timezone: 'Europe/London' },
  US: { currency: 'USD', timezone: 'America/New_York' },
} as const;

/** Defaults only, not tax advice. US timezone/state must be user-confirmed. */
export function resolveBusinessLocale(input: { language?: string; country?: string; timezone?: string; subdivision?: string }): BusinessLocale {
  const language = input.language === 'en' ? 'en' : 'fr';
  const country = (input.country ?? 'FR').toUpperCase();
  if (!(country in regions)) throw new Error('Unsupported business country');
  const businessCountry = country as BusinessCountry;
  const timezone = input.timezone ?? regions[businessCountry].timezone;
  new Intl.DateTimeFormat('en', { timeZone: timezone }); // reject invalid persisted configuration
  return { language, country: businessCountry, currency: regions[businessCountry].currency, timezone, locale: `${language}-${businessCountry}`, subdivision: input.subdivision };
}

export function formatBusinessMoney(cents: number, profile: BusinessLocale) {
  if (!Number.isSafeInteger(cents)) throw new Error('Money must be integer minor units');
  return new Intl.NumberFormat(profile.locale, { style: 'currency', currency: profile.currency }).format(cents / 100);
}

export function businessDocumentLabels(profile: BusinessLocale) {
  return {
    title: profile.language === 'fr' ? 'DEVIS' : profile.country === 'US' ? 'ESTIMATE' : 'QUOTE',
    tax: profile.language === 'fr' ? (profile.country === 'US' ? 'Taxe' : 'TVA') : (profile.country === 'US' ? 'Sales tax' : 'VAT'),
    companyIdentifier: profile.country === 'FR' ? 'SIRET' : profile.country === 'GB' ? 'Company number' : 'Business identifier',
    postalCode: profile.country === 'US' ? 'ZIP code' : profile.language === 'fr' ? 'Code postal' : 'Postcode',
    showFrenchVatExemption: profile.country === 'FR',
    requiresSubdivisionReview: profile.country === 'US',
  };
}
