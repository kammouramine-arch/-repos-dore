const CAMPAIGN_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  READY: { label: "Prête", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  RUNNING: { label: "En cours", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  PAUSED: { label: "En pause", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  DONE: { label: "Terminée", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  CANCELLED: { label: "Annulée", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
};

const MEMBER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "En attente", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  READY: { label: "Prêt", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  APPROVED: { label: "Approuvé", cls: "bg-gold-500/10 text-gold-300 ring-gold-500/25" },
  SENT: { label: "Envoyé", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  REPLIED: { label: "Répondu", cls: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/25" },
  BLOCKED: { label: "Bloqué", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  SKIPPED: { label: "Ignoré", cls: "bg-zinc-500/10 text-zinc-500 ring-zinc-400/15" },
  DONE: { label: "Terminé", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
};

const SEND_STATUS: Record<string, { label: string; cls: string }> = {
  SENT: { label: "Envoyé réellement", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  SIMULATED: { label: "Simulé", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  BLOCKED: { label: "Bloqué", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  FAILED: { label: "Échec", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  BOUNCED: { label: "Rebond", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
};

const CLIENT_STATUS: Record<string, { label: string; cls: string }> = {
  ONBOARDING: { label: "Onboarding", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  ACTIVE: { label: "Actif", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  IN_PRODUCTION: { label: "En production", cls: "bg-gold-500/10 text-gold-300 ring-gold-500/25" },
  DELIVERED: { label: "Livré", cls: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/25" },
  CHURNED: { label: "Perdu", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
};

const PHASE_STATUS: Record<string, { label: string; cls: string }> = {
  ONBOARDING: { label: "Onboarding", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  CONTENT: { label: "Contenu", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  PRODUCTION: { label: "Production", cls: "bg-gold-500/10 text-gold-300 ring-gold-500/25" },
  QA: { label: "Contrôle qualité", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  DELIVERY: { label: "Livraison", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  DONE: { label: "Terminé", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  BLOCKED: { label: "Bloqué", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
};

const FALLBACK = { label: "—", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" };

function make(map: Record<string, { label: string; cls: string }>) {
  function Badge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
    const meta = map[status] ?? { ...FALLBACK, label: status };
    const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ring-1 ring-inset ${pad} ${meta.cls}`}
      >
        {meta.label}
      </span>
    );
  }
  return Badge;
}

export const CampaignStatusBadge = make(CAMPAIGN_STATUS);
export const MemberStatusBadge = make(MEMBER_STATUS);
export const SendStatusBadge = make(SEND_STATUS);
export const ClientStatusBadge = make(CLIENT_STATUS);
export const PhaseBadge = make(PHASE_STATUS);
