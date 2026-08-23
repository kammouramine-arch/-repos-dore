"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  draftReply,
  approveProposedReply,
  rejectProposedReply,
  stopContacting,
} from "@/app/operator/actions";

/**
 * Actions du centre de contrôle.
 *
 * Aucune ne déclenche d'envoi : « Approuver » place la réponse en file
 * d'attente, l'expédition reste soumise à DRY_RUN et à la conformité.
 */
export function OperatorActions({
  replyId,
  decisionAction,
  proposedStatus,
}: {
  replyId: string;
  decisionAction: string | null;
  proposedStatus: string | null;
}) {
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const router = useRouter();

  const bloque = decisionAction === "BLACKLIST";

  const lancer = (fn: () => Promise<unknown>) =>
    start(async () => {
      setErreur(null);
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      }
    });

  if (bloque) {
    return (
      <p className="text-[12px] text-rose-300/85">
        Opposition enregistrée : aucune action commerciale n&apos;est possible.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {proposedStatus !== "APPROVED" && (
          <Bouton
            onClick={() => lancer(() => draftReply(replyId))}
            disabled={pending}
            variant="gold"
          >
            {proposedStatus ? "Rédiger à nouveau" : "Rédiger une réponse"}
          </Bouton>
        )}

        {proposedStatus === "DRAFT" && (
          <>
            <Bouton onClick={() => lancer(() => approveProposedReply(replyId))} disabled={pending} variant="ok">
              Approuver
            </Bouton>
            <Bouton onClick={() => lancer(() => rejectProposedReply(replyId))} disabled={pending}>
              Écarter
            </Bouton>
          </>
        )}

        {proposedStatus === "APPROVED" && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            Approuvée — en file d&apos;attente
          </span>
        )}

        <Bouton onClick={() => lancer(() => stopContacting(replyId))} disabled={pending} variant="danger">
          Ne plus contacter
        </Bouton>
      </div>

      {erreur && <p className="text-[12px] text-rose-300">{erreur}</p>}
    </div>
  );
}

function Bouton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "gold" | "ok" | "danger";
}) {
  const styles =
    variant === "gold"
      ? "bg-gold-500/15 text-gold-200 ring-gold-500/30 hover:bg-gold-500/25"
      : variant === "ok"
        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25 hover:bg-emerald-500/20"
        : variant === "danger"
          ? "text-rose-300/80 ring-rose-500/25 hover:bg-rose-500/10"
          : "text-zinc-400 ring-line hover:bg-ink-850 hover:text-zinc-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 ring-inset transition-colors disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
