import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Clock3, FileText, Mail, Phone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { registerQuoteView } from '@/server/services/quoteService';
import { computeQuoteTotals, formatCents, formatQuantity, formatPercent } from '@/lib/money';
import { hashIp } from '@/lib/auth/tokens';
import { clientIpFrom } from '@/lib/auth/session';
import { fullName } from '@/lib/utils';
import { formatDate } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Votre devis',
  robots: { index: false, follow: false },
};

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      items: { orderBy: { position: 'asc' } },
      customer: true,
      organization: { include: { businessProfile: { include: { logo: true } } } },
      files: { where: { deletedAt: null, kind: 'PHOTO_CHANTIER' } },
    },
  });

  if (!quote || quote.deletedAt || quote.status === 'BROUILLON' || quote.status === 'ANNULE') {
    notFound();
  }

  const headerList = await headers();
  await registerQuoteView(token, {
    ipHash: hashIp(clientIpFrom(headerList)),
    userAgent: headerList.get('user-agent'),
  });

  const profile = quote.organization.businessProfile;
  const vatExempt = profile?.vatStatus === 'FRANCHISE_EN_BASE';
  const brandColor = profile?.brandColor ?? '#2547e0';

  const totals = computeQuoteTotals({
    lines: quote.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents,
      discountRate: Number(item.discountRate),
      vatRate: vatExempt ? 0 : Number(item.vatRate),
    })),
    globalDiscountRate: Number(quote.discountRate),
    depositRate: Number(quote.depositRate),
    vatExempt,
  });

  const expired = quote.validUntil != null && quote.validUntil < new Date();
  const companyName = profile?.legalName ?? quote.organization.name;

  return (
    <div className="min-h-dvh bg-surface py-6 sm:py-12" style={{ ['--brand' as string]: brandColor }}>
      <main id="contenu" className="mx-auto w-full max-w-[820px] px-4">
        {/* En-tête entreprise */}
        <div className="overflow-hidden rounded-[18px] border border-line bg-canvas shadow-sm">
          <div className="h-1.5 w-full" style={{ background: brandColor }} aria-hidden />

          <header className="flex flex-wrap items-start justify-between gap-6 px-6 pb-6 pt-7 sm:px-9">
            <div className="flex items-center gap-4">
              {profile?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/public/logo/${profile.logo.id}`}
                  alt={companyName}
                  className="h-12 w-auto max-w-[160px] object-contain"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[12px] text-[17px] font-semibold text-white"
                  style={{ background: brandColor }}
                  aria-hidden
                >
                  {companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{companyName}</p>
                {profile?.city ? (
                  <p className="text-[13px] text-muted">
                    {[profile.postalCode, profile.city].filter(Boolean).join(' ')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">
                Devis
              </p>
              <p className="text-[15px] font-semibold text-ink tabular">{quote.number}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Émis le {formatDate(quote.createdAt)}
              </p>
            </div>
          </header>

          <div className="border-t border-line px-6 py-7 sm:px-9">
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[28px]">
              {quote.title}
            </h1>
            {quote.introduction || quote.summary ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
                {quote.introduction || quote.summary}
              </p>
            ) : null}

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
                  Établi pour
                </dt>
                <dd className="mt-1 text-[14px] text-ink">
                  {fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName)}
                  {quote.customer.city ? (
                    <span className="block text-[13px] text-muted">
                      {[quote.customer.postalCode, quote.customer.city].filter(Boolean).join(' ')}
                    </span>
                  ) : null}
                </dd>
              </div>
              {quote.validUntil ? (
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
                    Valable jusqu’au
                  </dt>
                  <dd className="mt-1 text-[14px] text-ink">{formatDate(quote.validUntil)}</dd>
                </div>
              ) : null}
              {quote.estimatedDurationMin ? (
                <div>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
                    Durée estimée
                  </dt>
                  <dd className="mt-1 text-[14px] text-ink tabular">
                    {formatQuantity(Math.round((quote.estimatedDurationMin / 60) * 10) / 10)} h
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Détail des prestations */}
          <div className="border-t border-line px-6 py-7 sm:px-9">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">
              Détail de la proposition
            </h2>

            <ul className="mt-4 divide-y divide-line">
              {quote.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-ink">{item.label}</p>
                    {item.description ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.description}</p>
                    ) : null}
                    <p className="mt-1.5 text-[12.5px] text-subtle tabular">
                      {formatQuantity(Number(item.quantity))} {item.unit} ×{' '}
                      {formatCents(item.unitPriceCents)} HT
                      {Number(item.discountRate) > 0
                        ? ` · remise ${formatPercent(Number(item.discountRate))}`
                        : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-[14.5px] font-semibold text-ink tabular">
                    {formatCents(item.lineTotalCents)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-[14px]">
              <div className="flex justify-between text-muted">
                <span>Total HT</span>
                <span className="tabular">{formatCents(totals.subtotalCents)}</span>
              </div>
              {totals.discountCents > 0 ? (
                <div className="flex justify-between text-muted">
                  <span>Remise {formatPercent(Number(quote.discountRate))}</span>
                  <span className="tabular">− {formatCents(totals.discountCents)}</span>
                </div>
              ) : null}
              {vatExempt ? (
                <div className="flex justify-between text-muted">
                  <span>TVA</span>
                  <span>Non applicable</span>
                </div>
              ) : (
                totals.vatBreakdown
                  .filter((bucket) => bucket.baseCents !== 0)
                  .map((bucket) => (
                    <div key={bucket.rate} className="flex justify-between text-muted">
                      <span>TVA {formatPercent(bucket.rate)}</span>
                      <span className="tabular">{formatCents(bucket.vatCents)}</span>
                    </div>
                  ))
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-[14px] font-semibold text-ink">Total TTC</span>
                <span className="text-[24px] font-semibold tracking-[-0.02em] tabular" style={{ color: brandColor }}>
                  {formatCents(totals.totalCents)}
                </span>
              </div>
              {totals.depositCents > 0 ? (
                <p className="text-right text-[12.5px] text-subtle tabular">
                  Acompte à la commande : {formatCents(totals.depositCents)}
                </p>
              ) : null}
            </div>
          </div>

          {quote.files.length > 0 ? (
            <div className="border-t border-line px-6 py-7 sm:px-9">
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">
                Photos du chantier
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {quote.files.slice(0, 6).map((file) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={file.id}
                    src={`/api/public/photo/${file.id}?devis=${token}`}
                    alt={file.fileName}
                    className="aspect-[4/3] w-full rounded-[10px] border border-line object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {quote.terms || profile?.quoteTerms || quote.paymentTerms || profile?.paymentTerms ? (
            <div className="border-t border-line bg-surface/40 px-6 py-7 sm:px-9">
              {quote.paymentTerms || profile?.paymentTerms ? (
                <section className="mb-5">
                  <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">
                    Modalités de paiement
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                    {quote.paymentTerms || profile?.paymentTerms}
                  </p>
                </section>
              ) : null}
              {quote.terms || profile?.quoteTerms ? (
                <section>
                  <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">
                    Conditions
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                    {quote.terms || profile?.quoteTerms}
                  </p>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Consultation uniquement : la réception du devis ne demande aucune
            décision dans DEVISIA. L'artisan garde la relation avec son client. */}
        <div className="mt-5">
          {expired ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-warning/25 bg-warning-soft px-5 py-4 text-warning">
              <Clock3 className="h-5 w-5 shrink-0" aria-hidden />
              <p className="text-[14px]">
                Ce devis a dépassé sa date de validité. Contactez {companyName} pour une mise à jour.
              </p>
            </div>
          ) : (
            <div className="rounded-[16px] border border-line bg-canvas p-5 shadow-sm sm:p-6">
              <p className="text-[15px] font-semibold text-ink">Votre devis est disponible</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                Ce document vous est transmis pour consultation. Pour une question ou pour donner
                suite, contactez directement {companyName}.
              </p>
              {profile?.phone || profile?.email ? (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {profile.phone ? (
                    <a
                      href={`tel:${profile.phone}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-medium text-white"
                      style={{ background: brandColor }}
                    >
                      <Phone className="h-4 w-4" aria-hidden />
                      Appeler {companyName}
                    </a>
                  ) : null}
                  {profile.email ? (
                    <a
                      href={`mailto:${profile.email}?subject=${encodeURIComponent(`Devis ${quote.number}`)}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line px-4 text-[13.5px] font-medium text-ink transition-colors hover:border-line-strong"
                    >
                      <Mail className="h-4 w-4" aria-hidden />
                      Envoyer un email
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <footer className="mt-6 space-y-1 px-2 text-center text-[12px] text-subtle">
          <p>
            {companyName}
            {profile?.siret ? ` · SIRET ${profile.siret}` : ''}
            {profile?.vatNumber ? ` · TVA ${profile.vatNumber}` : ''}
          </p>
          {vatExempt ? <p>TVA non applicable, article 293 B du CGI.</p> : null}
          {profile?.insurance ? <p>{profile.insurance}</p> : null}
          {profile?.quoteFooter ? <p>{profile.quoteFooter}</p> : null}
          <p className="flex items-center justify-center gap-1.5 pt-2 text-subtle">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Document contractuel — conservez ce devis avec vos échanges.
          </p>
        </footer>
      </main>
    </div>
  );
}
