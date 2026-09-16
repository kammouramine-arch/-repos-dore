import * as React from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import {
  INVOICE_STATUS_LABELS,
  formatCents,
  type InvoiceDetailDTO,
  type InvoiceStatusId,
  type InvoiceSummaryDTO,
} from '@devisia/shared';
import { Body, Button, Caption, Card, Divider, ErrorState, SectionHeader, Skeleton, Title } from './ui';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { useMobileLocale } from '@/lib/i18n';
import { useToast } from './toast';
import { colors, radius, spacing } from '@/theme';

/**
 * Factures de l'artisan.
 *
 * Répond à une seule question, celle qu'un artisan se pose le matin : qui me
 * doit de l'argent ? Le restant dû passe donc avant le montant total, et les
 * factures en retard remontent en tête.
 *
 * Rien à voir avec l'abonnement DEVISERA, qui vit dans « Abonnement ».
 *
 * Le corps vit ici plutôt que dans un écran : l'onglet Documents et la route
 * `/factures` montrent la même liste, et une seule implémentation évite
 * qu'elles se mettent à diverger.
 */

const STATUS_TONE: Record<InvoiceStatusId, { bg: string; fg: string }> = {
  BROUILLON: { bg: colors.surface2, fg: colors.muted },
  ENVOYEE: { bg: colors.accentSoft, fg: colors.accentHover },
  PARTIELLE: { bg: colors.warningSoft, fg: colors.warning },
  PAYEE: { bg: colors.successSoft, fg: colors.success },
  EN_RETARD: { bg: colors.dangerSoft, fg: colors.danger },
  ANNULEE: { bg: colors.surface2, fg: colors.subtle },
};

const STATUS_EN: Record<InvoiceStatusId, string> = {
  BROUILLON: 'Draft',
  ENVOYEE: 'Sent',
  PARTIELLE: 'Partly paid',
  PAYEE: 'Paid',
  EN_RETARD: 'Overdue',
  ANNULEE: 'Cancelled',
};

function StatusPill({ status, en }: { status: InvoiceStatusId; en: boolean }) {
  const tone = STATUS_TONE[status];
  return (
    <View style={{ paddingHorizontal: 10, height: 24, borderRadius: radius.full, backgroundColor: tone.bg, justifyContent: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: tone.fg }}>
        {en ? STATUS_EN[status] : INVOICE_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

/** Contrôle de rafraîchissement à passer au `Screen` qui héberge le tableau. */
export function useInvoiceBoard({ claimQuoteId }: { claimQuoteId?: string } = {}) {
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const query = useQuery<InvoiceSummaryDTO[]>(() => api.invoices.list({ take: 100 }), [], 'invoices:list');
  const [creating, setCreating] = React.useState(false);
  const claimed = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  /*
   * Arrivée depuis un devis qui vient d'être signé : la facture se crée sans
   * geste supplémentaire. L'artisan a déjà dit oui en signant.
   */
  React.useEffect(() => {
    if (claimed.current || !claimQuoteId) return;
    claimed.current = true;
    setCreating(true);
    void api.invoices
      .createFromQuote({ quoteId: claimQuoteId })
      .then((invoice: InvoiceDetailDTO) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        toast({ title: en ? `Invoice ${invoice.number} created.` : `Facture ${invoice.number} créée.` });
        void query.refresh({ force: true });
      })
      .catch((cause: unknown) => {
        toast({
          title:
            cause instanceof Error
              ? cause.message
              : en
                ? 'The invoice could not be created.'
                : 'La facture n’a pas pu être créée.',
        });
      })
      .finally(() => setCreating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimQuoteId]);

  const refreshControl = (
    <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh({ force: true })} tintColor={colors.accent} />
  );

  return { query, creating, refreshControl };
}

export function InvoiceBoard({ query, creating }: ReturnType<typeof useInvoiceBoard>) {
  const router = useRouter();
  const en = useMobileLocale() === 'en';
  const invoices = query.data;

  if (query.loading && !invoices) {
    return (
      <>
        <Card style={{ gap: spacing.md }}>
          <Skeleton height={14} width="40%" />
          <Skeleton height={30} width="65%" />
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <Skeleton height={16} width="70%" />
          <Skeleton height={16} width="50%" />
        </Card>
      </>
    );
  }

  if (!invoices) {
    return (
      <ErrorState
        description={query.error ?? (en ? 'Your invoices could not be loaded.' : 'Vos factures n’ont pas pu être chargées.')}
        onRetry={() => void query.reload()}
      />
    );
  }

  const outstanding = invoices
    .filter((invoice) => invoice.status !== 'ANNULEE' && invoice.balanceCents > 0)
    .reduce((acc, invoice) => acc + invoice.balanceCents, 0);
  const overdueCount = invoices.filter((invoice) => invoice.overdue).length;

  // Les retards d'abord : c'est ce qui coûte de l'argent.
  const ordered = [...invoices].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if ((a.balanceCents > 0) !== (b.balanceCents > 0)) return a.balanceCents > 0 ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <>
      {creating ? (
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }}>
          <Body style={{ color: colors.accentHover }}>{en ? 'Creating the invoice…' : 'Création de la facture…'}</Body>
        </Card>
      ) : null}

      {invoices.length === 0 ? (
        <Card style={{ gap: spacing.md, alignItems: 'flex-start' }}>
          <Title style={{ fontSize: 20 }}>{en ? 'No invoices yet' : 'Aucune facture pour l’instant'}</Title>
          <Body style={{ color: colors.muted, lineHeight: 22 }}>
            {en
              ? 'An invoice is created from a quote your client has accepted. Get a quote signed, then turn it into an invoice.'
              : 'Une facture naît d’un devis accepté par votre client. Faites signer un devis, puis facturez-le.'}
          </Body>
          <Button title={en ? 'See my quotes' : 'Voir mes devis'} onPress={() => router.push('/(app)/devis')} />
        </Card>
      ) : (
        <>
          {/* Ce qu'on attend d'être payé : le chiffre qui compte. */}
          <Card style={{ gap: 4, backgroundColor: outstanding > 0 ? colors.accentSoft : colors.canvas, borderColor: outstanding > 0 ? colors.accentBorder : colors.line }}>
            <Caption upper style={{ color: outstanding > 0 ? colors.accentHover : colors.subtle }}>
              {en ? 'Awaiting payment' : 'En attente de règlement'}
            </Caption>
            <Text style={{ fontSize: 32, fontWeight: '700', letterSpacing: -1.2, color: outstanding > 0 ? colors.accentHover : colors.ink }}>
              {formatCents(outstanding)}
            </Text>
            {overdueCount > 0 ? (
              <Body style={{ color: colors.danger, fontWeight: '600' }}>
                {en
                  ? `${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue`
                  : `${overdueCount} facture${overdueCount > 1 ? 's' : ''} en retard`}
              </Body>
            ) : null}
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title={en ? 'All invoices' : 'Toutes les factures'} />
            {ordered.map((invoice, index) => (
              <View key={invoice.id} style={{ gap: spacing.md }}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${invoice.number} — ${invoice.customerName}`}
                  onPress={() => void WebBrowser.openBrowserAsync(api.invoices.pdfUrl(invoice.id))}
                  style={({ pressed }) => ({ gap: 6, opacity: pressed ? 0.6 : 1 })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Body numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                      {invoice.customerName}
                    </Body>
                    <StatusPill status={invoice.status} en={en} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                    <Caption style={{ flex: 1, color: colors.subtle }} numberOfLines={1}>
                      {invoice.number} · {invoice.title}
                    </Caption>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: invoice.balanceCents > 0 ? colors.ink : colors.success }}>
                      {invoice.balanceCents > 0 ? formatCents(invoice.balanceCents) : formatCents(invoice.totalCents)}
                    </Text>
                  </View>
                  {invoice.balanceCents > 0 && invoice.paidCents > 0 ? (
                    <Caption style={{ color: colors.subtle }}>
                      {en
                        ? `${formatCents(invoice.paidCents)} received of ${formatCents(invoice.totalCents)}`
                        : `${formatCents(invoice.paidCents)} reçus sur ${formatCents(invoice.totalCents)}`}
                    </Caption>
                  ) : null}
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
