import Link from "next/link";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
import { offerMeta } from "@/lib/constants";
import { formatPrice, prettyDomain } from "@/lib/format";
import type { ProspectListItem } from "@/lib/prospects";

const TH = "px-3 py-3 text-left label-xs text-zinc-600 font-medium";
const TD = "px-3 py-3.5 align-middle";

export function ProspectTable({ prospects }: { prospects: ProspectListItem[] }) {
  if (prospects.length === 0) {
    return (
      <div className="panel px-6 py-16 text-center">
        <p className="text-sm text-zinc-400">Aucun prospect pour ce filtre.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Lancez une recherche : <code className="text-zinc-500">npm run amyn -- &quot;Trouve 20 coiffeurs à Lille&quot;</code>
        </p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-ink-850/60">
              <th className={TH}>Entreprise</th>
              <th className={TH}>Ville &amp; secteur</th>
              <th className={TH}>Email</th>
              <th className={TH}>Problème</th>
              <th className={`${TH} text-right`}>Score</th>
              <th className={TH}>Offre</th>
              <th className={TH}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => {
              const offer = offerMeta(p.recommendedOffer);
              return (
                <tr key={p.id} className="group border-b border-line-soft last:border-0 transition-colors hover:bg-ink-850/70">
                  <td className={TD}>
                    <Link href={`/prospects/${p.id}`} className="block">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-medium text-zinc-100 transition-colors group-hover:text-gold-300">
                          {p.name}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-600">
                        {p.website ? prettyDomain(p.website) : "aucun site"}
                      </div>
                    </Link>
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <div className="text-zinc-400">{p.city}</div>
                    <div className="mt-0.5 max-w-[130px] truncate text-xs text-zinc-600" title={p.sector}>
                      {p.sector}
                    </div>
                  </td>
                  <td className={TD}>
                    {p.primaryContact ? (
                      <span className="block max-w-[160px] truncate font-mono text-xs text-zinc-300" title={p.primaryContact.email}>
                        {p.primaryContact.email}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-700">non trouvé</span>
                    )}
                  </td>
                  <td className={TD}>
                    {p.topIssue ? (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <SeverityBadge severity={p.topIssue.severity} />
                        <span className="max-w-[150px] truncate text-zinc-300" title={p.topIssue.title}>
                          {p.topIssue.title}
                        </span>
                        {p._count.issues > 1 && (
                          <span className="text-xs text-zinc-600">+{p._count.issues - 1}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-700">pas d&apos;audit</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>
                    {p.overallScore !== null ? (
                      <span className={p.overallScore >= 65 ? "text-gold-300" : "text-zinc-400"}>
                        {p.overallScore}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {offer ? (
                      <span>
                        <span className="block text-zinc-300">{offer.label}</span>
                        <span className="block text-xs text-zinc-600">
                          {formatPrice(p.recommendedPrice, offer.unit)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </td>
                  <td className={TD}><StatusBadge status={p.status} size="sm" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
