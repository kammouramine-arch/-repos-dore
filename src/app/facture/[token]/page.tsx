import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { publicInvoice } from '@/server/services/paymentAccountService';
import { formatCents } from '@/lib/money';
import { formatDate } from '@/lib/i18n';
import { PayButton } from './pay-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Votre facture',
  robots: { index: false, follow: false },
};

/**
 * La page de règlement, côté client de l'artisan.
 *
 * Elle porte la marque de **l'artisan**, pas celle de DEVISERA : c'est lui
 * que le client connaît, c'est à lui qu'on paie. DEVISERA n'apparaît qu'en
 * pied de page, discrètement.
 *
 * Le montant affiché vient du serveur et le bouton ne fait que demander une
 * session de paiement : rien dans cette page ne décide de ce qui sera
 * prélevé. La confirmation, elle, viendra du webhook signé — le retour du
 * navigateur n'est qu'une indication, jamais une preuve.
 */
export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { token } = await params;
  const { paiement } = await searchParams;

  let invoice;
  try {
    invoice = await publicInvoice(token);
  } catch (cause) {
    if (cause instanceof AppError && cause.code === 'NOT_FOUND') notFound();
    throw cause;
  }

  const accent = invoice.brandColor;
  const settled = invoice.balanceCents <= 0;

  return (
    <main className="min-h-dvh bg-[#F5F7FB] px-4 py-10 text-[#0B1220]">
      <div className="mx-auto w-full max-w-lg">
        <header
          className="rounded-t-3xl px-7 pb-8 pt-7 text-white"
          style={{ background: `linear-gradient(160deg, ${accent} 0%, ${accent}e6 60%, ${accent}cc 100%)` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">Facture</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{invoice.number}</p>
            </div>
            {invoice.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.logoUrl}
                alt={invoice.businessName}
                className="h-14 w-14 rounded-xl bg-white object-contain p-1.5"
              />
            ) : null}
          </div>
          <p className="mt-5 text-lg font-semibold">{invoice.businessName}</p>
          <p className="text-sm opacity-85">{invoice.title}</p>
        </header>

        <section className="rounded-b-3xl bg-white px-7 py-7 shadow-[0_18px_40px_-24px_rgba(10,26,74,0.35)]">
          {paiement === 'recu' ? (
            <p className="mb-6 rounded-2xl bg-[#E7F6EF] px-5 py-4 text-sm font-medium text-[#0F7A52]">
              Merci. Votre paiement a été transmis à votre banque. La facture passera à « payée » dès
              confirmation — cela prend en général quelques secondes.
            </p>
          ) : null}
          {paiement === 'annule' ? (
            <p className="mb-6 rounded-2xl bg-[#FDF3E6] px-5 py-4 text-sm font-medium text-[#A35B06]">
              Paiement interrompu. Rien n’a été prélevé ; vous pouvez reprendre quand vous voulez.
            </p>
          ) : null}

          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#667085]">Adressée à</dt>
              <dd className="font-semibold">{invoice.customerName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#667085]">Montant total</dt>
              <dd className="font-semibold">{formatCents(invoice.totalCents)}</dd>
            </div>
            {invoice.paidCents > 0 ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#667085]">Déjà réglé</dt>
                <dd className="font-semibold text-[#0F7A52]">{formatCents(invoice.paidCents)}</dd>
              </div>
            ) : null}
            {invoice.dueAt ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#667085]">À régler avant le</dt>
                <dd className="font-semibold">{formatDate(invoice.dueAt)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-7 rounded-2xl bg-[#F5F7FB] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">
              {settled ? 'Total réglé' : 'Restant dû'}
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight" style={{ color: settled ? '#0F7A52' : accent }}>
              {formatCents(settled ? invoice.totalCents : invoice.balanceCents)}
            </p>
          </div>

          <div className="mt-7 space-y-3">
            {invoice.payable ? (
              <PayButton token={token} accent={accent} amountLabel={formatCents(invoice.balanceCents)} />
            ) : (
              <p className="rounded-2xl bg-[#EEF2F7] px-5 py-4 text-sm text-[#475467]">
                {invoice.unavailableReason}
              </p>
            )}
            <a
              href={invoice.pdfUrl}
              className="block rounded-2xl border border-[#E8ECF2] px-5 py-4 text-center text-sm font-semibold text-[#243044] transition hover:bg-[#F5F7FB]"
            >
              Télécharger la facture en PDF
            </a>
          </div>

          {invoice.paymentDetails ? (
            <div className="mt-7 border-t border-[#E8ECF2] pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">
                Coordonnées de règlement
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-[#475467]">{invoice.paymentDetails}</p>
            </div>
          ) : null}

          {invoice.businessEmail ? (
            <p className="mt-6 text-center text-xs text-[#98A2B3]">
              Une question sur cette facture ?{' '}
              <a className="font-semibold text-[#475467] underline" href={`mailto:${invoice.businessEmail}`}>
                {invoice.businessEmail}
              </a>
            </p>
          ) : null}
        </section>

        <p className="mt-6 text-center text-xs text-[#98A2B3]">
          Paiement sécurisé. Vos informations de carte sont saisies chez notre prestataire de paiement et
          ne transitent jamais par DEVISERA.
        </p>
      </div>
    </main>
  );
}
