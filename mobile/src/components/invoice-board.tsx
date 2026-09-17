import * as React from 'react';
import { Pressable, RefreshControl, Share, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  INVOICE_STATUS_LABELS,
  formatCents,
  type InvoiceDetailDTO,
  type InvoiceStatusId,
  type InvoiceSummaryDTO,
  type PaymentAccountDTO,
} from '@devisia/shared';
import { Body, Button, Caption, Card, Divider, ErrorState, SectionHeader, Skeleton, Title } from './ui';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { localizeText, useMobileLocale } from '@/lib/i18n';
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

/*
 * Lu à chaque rendu, jamais figé au chargement du module.
 *
 * Un objet de couleurs évalué à l'import garde la palette du premier rendu :
 * la bascule en mode sombre laissait des pastilles blanches au milieu de la
 * nuit. La fonction relit `colors`, qui est muté par `applyScheme`.
 */
function STATUS_TONE(): Record<InvoiceStatusId, { bg: string; fg: string }> {
  return {
  BROUILLON: { bg: colors.surface2, fg: colors.muted },
  ENVOYEE: { bg: colors.accentSoft, fg: colors.accentHover },
  PARTIELLE: { bg: colors.warningSoft, fg: colors.warning },
  PAYEE: { bg: colors.successSoft, fg: colors.success },
  EN_RETARD: { bg: colors.dangerSoft, fg: colors.danger },
  ANNULEE: { bg: colors.surface2, fg: colors.subtle },
  };
}

const STATUS_EN: Record<InvoiceStatusId, string> = {
  BROUILLON: 'Draft',
  ENVOYEE: 'Sent',
  PARTIELLE: 'Partly paid',
  PAYEE: 'Paid',
  EN_RETARD: 'Overdue',
  ANNULEE: 'Cancelled',
};

function StatusPill({ status, en }: { status: InvoiceStatusId; en: boolean }) {
  const tone = STATUS_TONE()[status];
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

/**
 * Bandeau d'état de l'encaissement.
 *
 * L'artisan ne trouvait pas la fonction : elle existait, mais rien dans
 * l'écran des factures ne disait qu'elle existait. Une ligne au-dessus de la
 * liste répond à la question posée — « est-ce que mes clients peuvent me
 * payer par carte ? » — et mène à l'activation quand la réponse est non.
 *
 * Quand c'est actif, la ligne ne dit rien de plus : une fonction qui marche
 * n'a pas à s'annoncer à chaque ouverture.
 */
function CollectionState({ account, en, onPress }: { account: PaymentAccountDTO; en: boolean; onPress: () => void }) {
  if (account.status === 'ACTIF') return null;
  const started = account.status === 'EN_COURS' || account.status === 'RESTREINT';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={en ? 'Set up online payments' : 'Activer l’encaissement en ligne'}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.accentSoft,
        borderWidth: 1,
        borderColor: colors.accentBorder,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name="card-outline" size={20} color={colors.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Caption style={{ color: colors.accentHover, fontWeight: '700' }}>
          {started
            ? (en ? 'Online payments — almost there' : 'Encaissement en ligne — presque prêt')
            : (en ? 'Let your clients pay by card' : 'Laissez vos clients régler par carte')}
        </Caption>
        <Caption style={{ color: colors.accentHover, fontWeight: '400' }}>
          {started
            ? (en ? 'A few details are still missing. Finish the setup.' : 'Il manque quelques informations. Terminez l’activation.')
            : (en ? 'Every invoice gets a secure payment link.' : 'Chaque facture reçoit un lien de paiement sécurisé.')}
        </Caption>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.accent} />
    </Pressable>
  );
}

export function InvoiceBoard({ query, creating }: ReturnType<typeof useInvoiceBoard>) {
  const router = useRouter();
  const locale = useMobileLocale();
  const en = locale === 'en';
  const account = useQuery<PaymentAccountDTO>(() => api.invoicePayments.account(), [], 'payment-account');
  const collecting = account.data?.status === 'ACTIF';

  /**
   * Envoie le lien de règlement au client.
   *
   * Le lien est public et porte le jeton de la facture : c'est lui qui donne
   * accès, pas une session. Il ouvre une page aux couleurs de l'artisan, où
   * le client paie par carte. Rien de sensible n'y transite : le montant est
   * recalculé par le serveur, et la confirmation viendra du webhook signé.
   *
   * Tant que l'encaissement n'est pas actif, le lien mènerait le client à une
   * page qui lui dit poliment de payer autrement. Envoyer cela est pire que
   * ne rien envoyer : on ouvre l'activation à la place.
   */
  async function collect(invoice: InvoiceSummaryDTO) {
    if (!collecting) {
      void Haptics.selectionAsync().catch(() => undefined);
      router.push('/encaissement');
      return;
    }
    const url = api.invoicePayments.publicUrl(invoice.publicToken);
    void Haptics.selectionAsync().catch(() => undefined);
    await Share.share({
      message: en
        ? `Invoice ${invoice.number} — pay online: ${url}`
        : `Facture ${invoice.number} — régler en ligne : ${url}`,
      url,
    }).catch(() => undefined);
  }
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

      {account.data ? (
        <CollectionState account={account.data} en={en} onPress={() => router.push('/encaissement')} />
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

                {/*
                  « Encaisser ».
                  
                  Proposé seulement quand il reste quelque chose à percevoir :
                  une facture soldée n'a pas besoin d'un lien de paiement, et
                  une facture annulée encore moins. Le lien part par la feuille
                  de partage d'iOS — message, e-mail, ce que l'artisan veut —
                  parce que c'est lui qui sait comment il parle à son client.
                */}
                {invoice.balanceCents > 0 && invoice.status !== 'ANNULEE' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${localizeText(locale, 'Encaisser')} · ${invoice.number}`}
                    onPress={() => void collect(invoice)}
                    hitSlop={6}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name={collecting ? 'card-outline' : 'add-circle-outline'} size={15} color={colors.accent} />
                    <Caption style={{ color: colors.accent, fontWeight: '700' }}>
                      {collecting
                        ? localizeText(locale, 'Encaisser')
                        : (en ? 'Set up card payments' : 'Activer le paiement par carte')}
                    </Caption>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
