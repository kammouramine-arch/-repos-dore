"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Layout";
import { getAuditCopy } from "@/lib/audit/copy";
import { openSealedAudit, type SealedAudit } from "@/lib/audit/seal";
import type { RevenueAudit } from "@/lib/audit/types";
import { site } from "@/lib/site";
import { AuditDocument } from "./AuditDocument";

/**
 * Audit privé : la clé est lue dans le lien (après `#k=`), jamais envoyée
 * au serveur. Sans clé valide, un message neutre — aucune information sur
 * l'audit (ni nom d'entreprise, ni contenu).
 */
type State = { status: "loading" } | { status: "ready"; audit: RevenueAudit } | { status: "invalid" };

export function SealedAuditView({ sealed }: { sealed: SealedAudit }) {
  const t = getAuditCopy(sealed.locale).sealed;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      const key = new URLSearchParams(window.location.hash.slice(1)).get("k");
      try {
        if (!key) throw new Error("no key");
        const audit = await openSealedAudit(sealed, key);
        if (alive) setState({ status: "ready", audit });
      } catch {
        if (alive) setState({ status: "invalid" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [sealed]);

  if (state.status === "ready") return <AuditDocument audit={state.audit} />;

  return (
    <section className="tone-ink flex min-h-[70svh] items-center pt-[var(--header-h)]">
      <Container>
        <p className="label text-gold">AMYN Revenue Audit™</p>
        {state.status === "loading" ? (
          <p role="status" className="mt-6 text-fg-2">
            {t.loading}
          </p>
        ) : (
          <div role="alert" className="mt-6 max-w-xl">
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.03em] text-fg">{t.invalidTitle}</h1>
            <p className="mt-4 text-fg-2">{t.invalidBody}</p>
            <a href={`mailto:${site.email}?subject=Revenue%20Audit`} className="link-line mt-6 inline-flex min-h-11 items-center text-fg">
              {site.email}
            </a>
          </div>
        )}
        <noscript>
          <p className="mt-6 max-w-xl text-fg-2">{t.noscript}</p>
        </noscript>
      </Container>
    </section>
  );
}
