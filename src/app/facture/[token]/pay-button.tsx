'use client';

import * as React from 'react';

/**
 * « Payer cette facture ».
 *
 * Le bouton ne connaît ni le montant ni le compte destinataire : il demande
 * au serveur d'ouvrir une session de paiement, et suit l'adresse renvoyée.
 * C'est ce qui garantit qu'un client ne peut pas décider de ce qu'il paie en
 * modifiant la page.
 */
export function PayButton({
  token,
  accent,
  amountLabel,
}: {
  token: string;
  accent: string;
  amountLabel: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function pay() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/facture/${token}/paiement`, { method: 'POST' });
      const body = (await response.json()) as { data?: { checkoutUrl?: string }; error?: { message?: string } };
      const url = body.data?.checkoutUrl;
      if (!response.ok || !url) {
        throw new Error(body.error?.message ?? 'Le paiement n’a pas pu être ouvert.');
      }
      window.location.href = url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le paiement n’a pas pu être ouvert.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void pay()}
        disabled={busy}
        className="w-full rounded-2xl px-5 py-4 text-center text-base font-semibold text-white transition disabled:opacity-70"
        style={{ backgroundColor: accent }}
      >
        {busy ? 'Ouverture du paiement…' : `Payer cette facture · ${amountLabel}`}
      </button>
      {error ? <p className="text-center text-sm text-[#B42318]">{error}</p> : null}
    </div>
  );
}
