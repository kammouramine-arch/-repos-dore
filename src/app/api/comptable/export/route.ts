import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { assertPlanFeature } from '@/server/services/accessService';
import { buildAccountingExport } from '@/server/services/accountingExportService';

const DATASETS = ['expenses', 'sales', 'payments'] as const;

const previewSchema = z.object({
  du: z.string(),
  au: z.string(),
});

const exportSchema = z.object({
  from: z.string(),
  to: z.string(),
  datasets: z.array(z.enum(DATASETS)).min(1).max(3),
  includeDocuments: z.boolean().optional(),
});

/** Aperçu chiffré d'une période, avant de lancer le téléchargement. */
export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('accounting:export');
    await assertPlanFeature(auth.organization.organizationId, 'accountantExport');
    const query = parseQuery(request, previewSchema);
    const result = await buildAccountingExport(auth.organization.organizationId, auth.user.id, {
      from: query.du,
      to: query.au,
      datasets: [...DATASETS],
    });
    return ok(result.summary);
  });
}

/**
 * Export complet : un CSV par jeu de données, plus la liste des pièces.
 *
 * Les pièces sont renvoyées par référence et non incorporées : une archive
 * de plusieurs dizaines de mégaoctets construite en mémoire dans une fonction
 * serveur échouerait au moment où l'artisan en a le plus besoin. Le client
 * télécharge les documents dont il a besoin à partir de ces liens.
 */
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('accounting:export');
    await assertPlanFeature(auth.organization.organizationId, 'accountantExport');
    const input = await parseBody(request, exportSchema);
    const result = await buildAccountingExport(auth.organization.organizationId, auth.user.id, input);
    return ok(result);
  });
}
