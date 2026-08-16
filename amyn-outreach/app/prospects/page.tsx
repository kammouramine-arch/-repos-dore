import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ProspectTable } from "@/components/ProspectTable";
import { listProspects, getStatusCounts } from "@/lib/prospects";
import { PROSPECT_STATUSES, STATUS_META, isProspectStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const active = params.status && isProspectStatus(params.status) ? params.status : null;

  const [prospects, counts] = await Promise.all([
    listProspects(active ?? undefined),
    getStatusCounts(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Prospects"
        title={active ? STATUS_META[active].label : "Toutes les fiches"}
        description={
          active
            ? STATUS_META[active].description
            : "Cliquez sur une entreprise pour ouvrir sa fiche : informations, sources, diagnostic, email généré et historique."
        }
      />

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/prospects" label="Tous" count={counts.TOTAL} active={!active} />
        {PROSPECT_STATUSES.map((status) => (
          <FilterChip
            key={status}
            href={`/prospects?status=${status}`}
            label={STATUS_META[status].label}
            count={counts[status]}
            active={active === status}
            dot={STATUS_META[status].dot}
          />
        ))}
      </div>

      <ProspectTable prospects={prospects} />
    </div>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
  dot,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-gold-500/40 bg-gold-500/10 text-gold-200"
          : "border-line bg-ink-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
      {label}
      <span className="tabular-nums text-xs text-zinc-600">{count}</span>
    </Link>
  );
}
