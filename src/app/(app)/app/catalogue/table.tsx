'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { formatCents, formatPercent } from '@/lib/money';
import { useToast } from '@/components/ui/toast';
import { PriceBookForm, type PriceBookItemView } from './form';

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAU: 'Matériau',
  SERVICE: 'Prestation',
  MAIN_OEUVRE: 'Main-d’œuvre',
  PACK: 'Forfait',
};

export function PriceBookTable({
  items,
  writable,
  initialSearch,
}: {
  items: PriceBookItemView[];
  writable: boolean;
  initialSearch: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [category, setCategory] = React.useState<string>('');
  const [editing, setEditing] = React.useState<PriceBookItemView | null>(null);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = !category || item.category === category;
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.reference ?? '').toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [items, search, category]);

  async function remove(item: PriceBookItemView) {
    if (!window.confirm(`Supprimer « ${item.name} » du catalogue ?`)) return;
    const response = await fetch(`/api/pricebook/${item.id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast({ title: 'Suppression impossible', tone: 'error' });
      return;
    }
    toast({ title: 'Article supprimé' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un article…"
          className="max-w-xs"
          aria-label="Rechercher dans le catalogue"
        />
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-[168px]"
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center text-[13px] text-subtle tabular">
          {filtered.length} article{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      <Card className="overflow-hidden">
        <table className="hidden w-full text-left md:table">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              {['Article', 'Catégorie', 'Unité', 'Achat HT', 'Vente HT', 'Marge', 'TVA', ''].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-subtle"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-surface/50">
                <td className="px-4 py-3">
                  <p className="text-[13.5px] font-medium text-ink">{item.name}</p>
                  {item.reference ? (
                    <p className="text-[12px] text-subtle tabular">{item.reference}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[13px] text-muted">{CATEGORY_LABELS[item.category]}</td>
                <td className="px-4 py-3 text-[13px] text-muted">{item.unit}</td>
                <td className="px-4 py-3 text-[13px] text-muted tabular">
                  {formatCents(item.costPriceCents)}
                </td>
                <td className="px-4 py-3 text-[13.5px] font-medium text-ink tabular">
                  {formatCents(item.salePriceCents)}
                </td>
                <td className="px-4 py-3">
                  {item.marginRate != null ? (
                    <Badge tone={item.marginRate >= 25 ? 'success' : item.marginRate >= 10 ? 'neutral' : 'warning'}>
                      {formatPercent(item.marginRate)}
                    </Badge>
                  ) : (
                    <span className="text-[13px] text-subtle">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[13px] text-muted tabular">{formatPercent(item.vatRate)}</td>
                <td className="px-4 py-3 text-right">
                  {writable ? (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="rounded-[6px] p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                        aria-label={`Modifier ${item.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(item)}
                        className="rounded-[6px] p-1.5 text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Supprimer ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="divide-y divide-line md:hidden">
          {filtered.map((item) => (
            <li key={item.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{item.name}</p>
                  <p className="text-[12.5px] text-subtle">
                    {CATEGORY_LABELS[item.category]} · {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-semibold text-ink tabular">
                    {formatCents(item.salePriceCents)}
                  </p>
                  {item.marginRate != null ? (
                    <p className="text-[12px] text-subtle tabular">marge {formatPercent(item.marginRate)}</p>
                  ) : null}
                </div>
              </div>
              {writable ? (
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="mt-2 text-[13px] font-medium text-accent"
                >
                  Modifier
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13.5px] text-subtle">
            Aucun article ne correspond à cette recherche.
          </p>
        ) : null}
      </Card>

      {editing ? (
        <PriceBookForm item={editing} open onOpenChange={(open) => !open && setEditing(null)} />
      ) : null}
    </div>
  );
}
