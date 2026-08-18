import { requirePermission } from '@/lib/auth/session';
import { fail, ok, route } from '@/server/api';
import { AppError } from '@/lib/errors';
import { importPriceBookCsv } from '@/server/services/priceBookService';

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('pricebook:write');
    const form = await request.formData().catch(() => null);
    if (!form) throw new AppError('VALIDATION', 'Fichier CSV manquant.');

    const file = form.get('file');
    if (!(file instanceof File)) throw new AppError('VALIDATION', 'Fichier CSV manquant.');
    if (file.size > MAX_CSV_BYTES) throw new AppError('VALIDATION', 'Le fichier dépasse 2 Mo.');

    const content = await file.text();
    const result = await importPriceBookCsv(
      auth.organization.organizationId,
      auth.user.id,
      content,
    );
    return ok(result);
  }).catch(fail);
}
