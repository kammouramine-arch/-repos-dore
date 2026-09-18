import type { PlanId } from './plans';

export const APPLE_SUBSCRIPTION_GROUP = '22361541';
export const APPLE_PRODUCTS: Record<PlanId, string> = {
  ESSENTIEL: 'fr.devisia.essentiel.monthly',
  PRO: 'fr.devisia.pro.monthly',
  ENTREPRISE: 'fr.devisia.entreprise.monthly',
};
export function planForAppleProduct(productId: string): PlanId | null {
  return (Object.keys(APPLE_PRODUCTS) as PlanId[]).find((plan) => APPLE_PRODUCTS[plan] === productId) ?? null;
}
