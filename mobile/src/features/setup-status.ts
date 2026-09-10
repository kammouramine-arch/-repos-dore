import { api } from '@/lib/api';
import { businessComplete } from './setup-facts';
export { businessComplete } from './setup-facts';

/**
 * Où en est la mise en place de l'atelier.
 *
 * Trois faits lus dans les données réelles, jamais un drapeau à part :
 * l'entreprise est renseignée quand ses coordonnées légales existent, le
 * catalogue quand il a au moins une prestation, les clients quand il en
 * existe un. Une tâche accomplie reste cochée tant que le fait reste vrai.
 */
export interface SetupStatus {
  business: boolean;
  catalogue: boolean;
  clients: boolean;
}

export async function loadSetupStatus(): Promise<SetupStatus> {
  const [profile, catalogue, customers] = await Promise.all([
    api.organisation.profile().catch(() => null),
    api.priceBook.list().catch(() => []),
    api.customers.list().catch(() => ({ total: 0, items: [] })),
  ]);
  return { business: businessComplete(profile), catalogue: catalogue.length > 0, clients: customers.total > 0 };
}
