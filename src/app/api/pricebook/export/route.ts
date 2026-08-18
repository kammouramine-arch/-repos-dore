import { requirePermission } from '@/lib/auth/session';
import { fail } from '@/server/api';
import { exportPriceBookCsv } from '@/server/services/priceBookService';

export async function GET() {
  try {
    const auth = await requirePermission('pricebook:read');
    const csv = await exportPriceBookCsv(auth.organization.organizationId);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="catalogue-devisia.csv"`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
