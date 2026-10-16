/**
 * The brand, the assistant and the wake phrase — in one place.
 *
 * The public brand is "meepmeep" (lower-case, one word) and may only change
 * with explicit approval. Everything that says the name in code reads it from
 * here; `brand.test.ts` checks the pieces that cannot import it (the native
 * keyword file, the Expo app name) still agree.
 *
 * Interface copy that contains the name lives in the translation tables as
 * whole sentences, because word order differs between languages; a rename
 * means updating those sentences too, and the test lists where they are.
 *
 * Internal identifiers (bundle id `app.avyro.companion`, URL scheme `avyro`,
 * storage keys, the native module name) keep the previous name on purpose:
 * changing them would orphan installed data and break the App Store record.
 */
export const BRAND = {
  /** Public product name, as written in running text. */
  appName: 'meepmeep',
  /** What the driver talks to. Same as the product. */
  assistantName: 'meepmeep',
  wake: {
    /** How the wake phrase is written on screen. */
    display: 'Hey meepmeep',
    /** Spellings a speech recogniser may return for it (normalised forms). */
    spoken: ['hey meepmeep', 'hey meep meep'],
    /** Keyword label in the bundled native model's keywords.txt. */
    nativeKeywordId: 'HEY_MEEPMEEP',
  },
  /**
   * Earlier names a driver may still say out of habit. Accepted as wake
   * phrases so an update does not silently break their muscle memory; never
   * shown.
   */
  legacySpokenNames: ['avyro', 'aviro', 'avero'],
} as const;
