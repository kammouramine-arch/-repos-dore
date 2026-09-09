import * as React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { formatCents } from '@devisia/shared';
import { Badge, Banner, Body, Button, Card, Divider, EmptyState, Heading, IconButton, Muted, PressableCard, Screen, SectionHeader, Skeleton } from '@/components/ui';
import { Stagger } from '@/components/motion';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { colors, radius, spacing, typography } from '@/theme';
import { ClientForm } from '@/components/client-sheet';
import { useAuth } from '@/lib/auth';
import { localizeText, mobileLocale } from '@/lib/i18n';
export { RouteError as ErrorBoundary } from '@/components/route-error';

/**
 * Fiche client.
 *
 * L'écran alignait des paragraphes et des boutons de même poids : le nom,
 * l'adresse, le téléphone et les chiffres se lisaient d'un même ton. Ici,
 * l'identité tient une carte avec ses trois gestes (appeler, écrire, mail),
 * les chiffres tiennent une ligne, et chaque devis est une ligne avec son
 * statut. Mêmes données, mêmes appels d'API.
 */
const STATUS_TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  BROUILLON: 'neutral', ENVOYE: 'accent', CONSULTE: 'accent', ACCEPTE: 'success', REFUSE: 'danger', EXPIRE: 'warning', ANNULE: 'neutral', MODIFICATION_DEMANDEE: 'warning',
};

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const t = React.useCallback((value: string) => localizeText(locale, value), [locale]);
  const query = useQuery(() => api.customers.get(id), [id], `customer:${id}`);
  useFocusEffect(React.useCallback(() => { void query.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]));
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const customer = query.data?.customer;
  async function contact(url: string) {
    void Haptics.selectionAsync().catch(() => undefined);
    try { await Linking.openURL(url); } catch { setActionError(t('Cette action n’est pas disponible sur cet appareil.')); }
  }
  if (editing && customer) return <ClientForm initialCustomer={customer} submitLabel={t('Enregistrer les modifications')} onCancel={() => setEditing(false)} onCreated={() => { setEditing(false); void query.reload(); }} />;

  const statusLabel = (status: string) => ((en
    ? { BROUILLON: 'Draft', ENVOYE: 'Sent', CONSULTE: 'Viewed', ACCEPTE: 'Accepted', REFUSE: 'Declined', EXPIRE: 'Expired', ANNULE: 'Cancelled', MODIFICATION_DEMANDEE: 'Changes requested' }
    : { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', CONSULTE: 'Consulté', ACCEPTE: 'Accepté', REFUSE: 'Refusé', EXPIRE: 'Expiré', ANNULE: 'Annulé', MODIFICATION_DEMANDEE: 'Modification demandée' }) as Record<string, string>)[status] ?? (en ? 'Needs review' : 'À vérifier');
  const eventLabel = (type: string) => ((en
    ? { CREE: 'Quote created', MODIFIE: 'Quote updated', ENVOYE: 'Quote marked sent', CONSULTE: 'Quote viewed', ACCEPTE: 'Quote accepted', REFUSE: 'Quote declined', MODIFICATION_DEMANDEE: 'Changes requested', RELANCE: 'Follow-up recorded', PDF_TELECHARGE: 'PDF downloaded', ANNULE: 'Quote cancelled' }
    : { CREE: 'Devis créé', MODIFIE: 'Devis modifié', ENVOYE: 'Devis marqué envoyé', CONSULTE: 'Devis consulté', ACCEPTE: 'Devis accepté', REFUSE: 'Devis refusé', MODIFICATION_DEMANDEE: 'Modification demandée', RELANCE: 'Relance enregistrée', PDF_TELECHARGE: 'PDF téléchargé', ANNULE: 'Devis annulé' }) as Record<string, string>)[type] ?? (en ? 'Activity recorded' : 'Activité enregistrée');
  const date = (iso: string) => new Date(iso).toLocaleDateString(en ? 'en-GB' : 'fr-FR');

  return <Screen>
    {query.error ? <><Banner tone="danger" title={query.error} /><Button title={t('Réessayer')} onPress={() => void query.reload()} /></> : null}
    {actionError ? <Banner tone="danger" title={actionError} onDismiss={() => setActionError(null)} /> : null}
    {!customer && query.loading ? (
      <>
        <Card style={{ gap: spacing.md }}><Skeleton height={22} width="55%" /><Skeleton height={14} width="70%" /><Skeleton height={40} /></Card>
        <Card style={{ gap: spacing.md }}><Skeleton height={13} width="40%" /><Skeleton height={28} width="60%" /></Card>
        <Skeleton height={72} />
      </>
    ) : null}
    {customer && query.data ? (
      <Stagger step={55}>
        <Card style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>{customer.displayName.trim().charAt(0).toUpperCase() || 'C'}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading style={{ fontSize: 21, lineHeight: 26 }}>{customer.displayName}</Heading>
              <Muted numberOfLines={2}>
                {customer.companyName ? `${customer.companyName} · ` : ''}
                {[customer.addressLine1, customer.postalCode, customer.city].filter(Boolean).join(', ') || (en ? 'No address provided' : 'Adresse non renseignée')}
              </Muted>
            </View>
            <IconButton icon="create-outline" label={en ? 'Edit client' : 'Modifier le client'} onPress={() => setEditing(true)} />
          </View>
          {(customer.phone || customer.email) ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {customer.phone ? <Button style={{ flex: 1 }} title={en ? 'Call' : 'Appeler'} icon="call-outline" variant="secondary" onPress={() => void contact(`tel:${customer.phone}`)} /> : null}
              {customer.phone ? <Button style={{ flex: 1 }} title="SMS" icon="chatbubble-outline" variant="secondary" onPress={() => void contact(`sms:${customer.phone}`)} /> : null}
              {customer.email ? <Button style={{ flex: 1 }} title="Email" icon="mail-outline" variant="secondary" onPress={() => void contact(`mailto:${customer.email}`)} /> : null}
            </View>
          ) : null}
          {customer.notes ? <Body style={{ color: colors.inkSoft }}>{customer.notes}</Body> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <Muted>{en ? 'Client since ' : 'Client depuis le '}{date(customer.createdAt)}</Muted>
            {customer.tags.length ? <Muted numberOfLines={1} style={{ flexShrink: 1 }}>{customer.tags.join(' · ')}</Muted> : null}
          </View>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={en ? 'Business history' : 'Historique commercial'} />
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.subtle, textTransform: 'uppercase' }]}>{en ? 'Quoted' : 'Devisé'}</Text>
              <Text style={[typography.metric, { color: colors.ink, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] }]}>{formatCents(query.data.stats.revenueCents, { compact: true })}</Text>
              <Text style={[typography.caption, { color: colors.subtle, letterSpacing: 0 }]}>{en ? 'sent quotes' : 'devis envoyés'}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.subtle, textTransform: 'uppercase' }]}>{en ? 'Pending' : 'En attente'}</Text>
              <Text style={[typography.metric, { color: colors.muted, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] }]}>{formatCents(query.data.stats.pendingCents, { compact: true })}</Text>
              <Text style={[typography.caption, { color: colors.subtle, letterSpacing: 0 }]}>{query.data.stats.quoteCount} {en ? 'quotes' : 'devis'} · {query.data.stats.jobCount} {en ? 'jobs' : 'chantiers'}</Text>
            </View>
          </View>
        </Card>

        <Button title={en ? 'Create a quote for this client' : 'Créer un devis pour ce client'} icon="add" haptic onPress={() => router.push({ pathname: '/devis/nouveau', params: { customerId: id } })} />

        <View style={{ gap: spacing.md }}>
          <SectionHeader title={en ? 'Quotes' : 'Devis'} />
          {query.data.quotes.length === 0 ? (
            <Card style={{ padding: 0 }}>
              <EmptyState icon="document-text-outline" title={en ? 'No quotes yet' : 'Aucun devis pour ce client'} description={en ? 'Create the first one above.' : 'Préparez son premier devis ci-dessus.'} />
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {query.data.quotes.map((quote, index) => (
                <View key={quote.id}>
                  {index > 0 ? <Divider /> : null}
                  <PressableCard haptic accessibilityLabel={en ? `Open quote ${quote.number}` : `Ouvrir le devis ${quote.number}`} onPress={() => router.push({ pathname: '/devis/[id]', params: { id: quote.id } })} style={{ borderWidth: 0, borderRadius: 0, shadowOpacity: 0, elevation: 0, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="document-text-outline" size={18} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Body numberOfLines={1} style={{ fontWeight: '600' }}>{quote.title}</Body>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                        <Muted style={{ fontSize: 12 }}>{quote.number}{quote.sentAt ? ` · ${date(quote.sentAt)}` : ''}</Muted>
                        <Badge label={statusLabel(quote.status)} tone={STATUS_TONES[quote.status] ?? 'neutral'} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Body style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatCents(quote.totalCents, { compact: true })}</Body>
                      <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
                    </View>
                  </PressableCard>
                </View>
              ))}
            </Card>
          )}
        </View>

        {query.data.jobs?.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={en ? 'Jobs' : 'Chantiers'} />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {query.data.jobs.map((job, index) => (
                <View key={job.id} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 3, borderTopWidth: index > 0 ? 0.5 : 0, borderTopColor: colors.line }}>
                  <Body style={{ fontWeight: '600' }}>{job.title}</Body>
                  <Muted style={{ fontSize: 13 }}>{job.completedAt ? (en ? `Completed on ${date(job.completedAt)}` : `Terminé le ${date(job.completedAt)}`) : job.scheduledAt ? (en ? `Scheduled for ${date(job.scheduledAt)}` : `Prévu le ${date(job.scheduledAt)}`) : (en ? 'Date not provided' : 'Date non renseignée')}</Muted>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {query.data.activity?.length ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={en ? 'Client activity' : 'Activité du client'} />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {query.data.activity.map((event, index) => (
                <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={en ? `View ${event.quoteNumber}` : `Voir ${event.quoteNumber}`} onPress={() => { void Haptics.selectionAsync().catch(() => undefined); router.push({ pathname: '/devis/[id]', params: { id: event.quoteId } }); }} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: index > 0 ? 0.5 : 0, borderTopColor: colors.line }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, opacity: 0.7 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body numberOfLines={1} style={{ fontSize: 14 }}>{eventLabel(event.type)} · {event.quoteNumber}</Body>
                    <Muted style={{ fontSize: 12 }}>{new Date(event.at).toLocaleString(en ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</Muted>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.subtle} />
                </Pressable>
              ))}
            </Card>
            <Muted style={{ fontSize: 12 }}>{en ? 'A recorded view does not prove the email was read.' : 'Une consultation enregistrée ne prouve pas la lecture de l’email.'}</Muted>
          </View>
        ) : null}
        <View style={{ height: radius.md }} />
      </Stagger>
    ) : null}
  </Screen>;
}
