import type { NativeStorekitInspection } from './types';
export type { NativeStorekitInspection, NativeStorekitOffer, NativeStorekitProduct } from './types';

type NativeApi = { inspectProducts(skus: string[]): Promise<NativeStorekitInspection> };
let resolved: Promise<NativeApi | null> | undefined;

/**
 * Le module natif est résolu paresseusement : un binaire plus ancien, le web
 * ou un test Node n'ont pas le module, et ne doivent pas charger le runtime
 * Expo pour l'apprendre.
 */
function load(): Promise<NativeApi | null> {
  if (!resolved) {
    resolved = import('expo-modules-core')
      .then((core) => core.requireOptionalNativeModule<NativeApi>('DeviseraStoreKit'))
      .catch(() => null);
  }
  return resolved;
}

/** True only in a binary that embeds the direct StoreKit module. */
export async function nativeStorekitAvailable() {
  return (await load()) !== null;
}

export async function inspectNativeStorekit(skus: string[]): Promise<NativeStorekitInspection> {
  const native = await load();
  if (!native) throw Object.assign(new Error('Direct StoreKit inspection is not embedded in this build.'), { code: 'NATIVE_STOREKIT_UNAVAILABLE' });
  return native.inspectProducts(skus);
}
