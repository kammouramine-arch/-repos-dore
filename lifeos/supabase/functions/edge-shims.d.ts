/**
 * Minimal ambient declarations so the edge functions can be typechecked with plain tsc.
 *
 * Deno supplies these at run time and `deno check` validates them properly in CI; this
 * shim exists so a migration mistake surfaces in seconds locally instead of at deploy.
 * It declares only what LifeOS actually uses — it is not a Deno type definition.
 */

declare namespace Deno {
  export const env: { get(name: string): string | undefined };
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// The Anthropic SDK is a Deno npm: import and is not installed for the app build.
// Declared loosely on purpose: this module disappears in Phase 14.
declare module '@anthropic-ai/sdk' {
  const Anthropic: any;
  export default Anthropic;
}
