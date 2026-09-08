import * as React from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PLANS, accessStateFor, type BillingHistoryEntryDTO, type BillingHistoryDTO } from '@devisia/shared';
import { Banner, Button, Card, EmptyState, ErrorState, Heading, Muted, Screen, Skeleton } from '@/components/ui';
import { SettingsGroup, SettingsRow, StatusChip } from '@/components/settings';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { mobileLocale } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * « Paiements et factures ».
 *
 * L'artisan veut savoir ce qu'il paie, quand, et retrouver un reçu. L'écran
 * lit la formule courante depuis la session et l'historique du fournisseur
 * depuis l'API. Les erreurs restent récupérables, jamais masquées en historique vide.
 */
function money(amountCents: number, currency: string, en: boolean) {
  try {
    return new Intl.NumberFormat(en ? 'en-GB' : 'fr-FR', { style: 'currency', currency }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

function PaymentRow({ payment, last, en, source }: { payment: BillingHistoryEntryDTO; last: boolean; en: boolean; source: string }) {
  const status = {
    paid: { label: en ? 'Paid' : 'Payé', tone: 'success' as const },
    open: { label: en ? 'Pending' : 'En attente', tone: 'warning' as const },
    failed: { label: en ? 'Failed' : 'Échoué', tone: 'warning' as const },
    void: { label: en ? 'Void' : 'Annulée', tone: 'neutral' as const },
    uncollectible: { label: en ? 'Uncollectible' : 'Irrécouvrable', tone: 'warning' as const },
    unknown: { label: en ? 'Unknown' : 'Inconnu', tone: 'neutral' as const },
  }[payment.status];
  const date = new Date(payment.date).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.line }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={source === 'apple' ? 'logo-apple' : 'globe-outline'} size={18} color={colors.inkSoft} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={[typography.body, { fontWeight: '600', color: colors.ink }]}>{payment.description}</Text>
        <Text style={[typography.small, { color: colors.muted }]}>{date} · {source === 'apple' ? 'Apple' : (en ? 'Web' : 'Web')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[typography.body, { fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] }]}>{money(payment.amountCents, payment.currency, en)}</Text>
        <StatusChip tone={status.tone} icon={payment.status === 'paid' ? 'checkmark-circle' : payment.status === 'void' ? 'return-down-back' : 'time-outline'} label={status.label} />
      </View>
      {payment.receiptUrl ? (
        <Ionicons name="chevron-forward" size={17} color={colors.subtle} onPress={() => void WebBrowser.openBrowserAsync(payment.receiptUrl!).catch(() => undefined)} />
      ) : null}
    </View>
  );
}

export default function PaiementsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const en = mobileLocale(session) === 'en';
  const [actionError, setActionError] = React.useState<string | null>(null);
  const acting = React.useRef(false);
  async function openBillingPortal() {
    if (acting.current) return;
    acting.current = true;
    setActionError(null);
    try { const { url } = await api.billing.portal(); await WebBrowser.openBrowserAsync(url); }
    catch { setActionError(en ? 'The billing portal could not open. Try again.' : 'Le portail de facturation n’a pas pu s’ouvrir. Réessayez.'); }
    finally { acting.current = false; }
  }
  const subscription = session?.subscription ?? null;
  const access = accessStateFor(subscription);
  const query = useQuery<BillingHistoryDTO>(() => api.billing.payments(), [session?.organization.id, en], `billing:payments:${session?.organization.id}:${en}`);

  const provider = subscription?.provider ?? 'trial';
  const renewal = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const statusLabel = !subscription
    ? (en ? 'No plan' : 'Aucune formule')
    : access.inTrial ? (en ? 'Free trial' : 'Essai gratuit')
      : subscription.status === 'active' ? (en ? 'Active' : 'Actif')
        : subscription.status === 'past_due' ? (en ? 'Payment past due' : 'Paiement en attente')
          : subscription.status === 'canceled' ? (en ? 'Cancelled' : 'Résilié')
            : (en ? 'To activate' : 'À activer');

  return (
    <Screen>
      {actionError ? <Banner tone="danger" title={actionError} /> : null}
      <Card style={{ gap: spacing.md, backgroundColor: colors.accentDeep, borderColor: colors.accentDeep, padding: spacing.xl, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accent, opacity: 0.35, right: -70, top: -90 }} />
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' }]}>{en ? 'Current plan' : 'Formule actuelle'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text style={[typography.title, { color: colors.white }]}>{subscription ? PLANS[subscription.plan].name : 'DEVISERA'}</Text>
          <StatusChip onLight label={statusLabel} icon={access.inTrial ? 'time-outline' : subscription?.status === 'active' ? 'checkmark-circle' : 'information-circle'} />
        </View>
        <Text style={[typography.body, { color: 'rgba(255,255,255,0.86)' }]}>
          {provider === 'apple' ? (en ? 'Managed by Apple' : 'Géré par Apple') : provider === 'stripe' ? (en ? 'Managed on the web' : 'Géré sur le web') : (en ? 'No payment method yet' : 'Aucun moyen de paiement pour le moment')}
          {renewal ? ` · ${access.inTrial ? (en ? 'trial ends' : 'fin de l’essai') : (subscription?.cancelAtPeriodEnd || subscription?.status === 'canceled' ? (en ? 'ends' : 'fin') : (en ? 'renews' : 'renouvellement'))} ${renewal}` : ''}
        </Text>
        <Button title={en ? 'Manage my subscription' : 'Gérer mon abonnement'} variant="secondary" style={{ marginTop: spacing.xs }} onPress={() => router.push('/abonnement')} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.subtle, textTransform: 'uppercase', paddingHorizontal: 4 }]}>{en ? 'Payment history' : 'Historique des paiements'}</Text>
        {query.loading && !query.data ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton height={14} width="55%" />
            <Skeleton height={14} width="70%" />
            <Skeleton height={14} width="40%" />
          </Card>
        ) : query.error && !query.data ? (
          <Card style={{ padding: 0 }}>
            <ErrorState description={query.error} onRetry={() => void query.reload()} />
          </Card>
        ) : !query.data || query.data.entries.length === 0 ? (
          <Card style={{ padding: 0 }}>
            <EmptyState
              icon="receipt-outline"
              title={provider === 'apple' ? (en ? 'Your Apple receipts' : 'Vos reçus Apple') : (en ? 'No payment recorded' : 'Aucun paiement enregistré')}
              description={query.data?.note ?? (en ? 'No payment recorded yet.' : 'Aucun paiement enregistré pour le moment.')}
            />
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {query.data.entries.map((payment, index) => (
              <PaymentRow key={payment.id} payment={payment} source={provider} last={index === query.data!.entries.length - 1} en={en} />
            ))}
          </Card>
        )}
      </View>

      {provider === 'apple' ? <SettingsGroup title="Apple" footer={en ? 'Apple subscriptions are billed and refunded by Apple. Receipts are in your Apple account.' : 'Les abonnements Apple sont facturés et remboursés par Apple. Les reçus sont dans votre compte Apple.'}>
        <SettingsRow icon="logo-apple" title={en ? 'Manage my Apple subscription' : 'Gérer mon abonnement Apple'} onPress={() => void Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => undefined)} />
        <SettingsRow icon="receipt-outline" title={en ? 'View my Apple purchases' : 'Voir mes achats Apple'} onPress={() => void Linking.openURL('https://reportaproblem.apple.com/').catch(() => undefined)} />
      </SettingsGroup> : provider === 'stripe' ? <SettingsGroup title="Web">
        <SettingsRow icon="globe-outline" title={en ? 'Open billing portal' : 'Ouvrir le portail de facturation'} onPress={() => void openBillingPortal()} />
      </SettingsGroup> : null}

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Heading style={{ fontSize: 15 }}>{en ? 'A question about a payment?' : 'Une question sur un paiement ?'}</Heading>
        <Muted style={{ textAlign: 'center' }}>{en ? 'Write to contact@devisera.fr with the date and amount.' : 'Écrivez à contact@devisera.fr en indiquant la date et le montant.'}</Muted>
      </View>
      <View style={{ height: radius.md }} />
    </Screen>
  );
}
