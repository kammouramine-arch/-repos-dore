import * as React from 'react';
import { Linking, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { formatCents } from '@devisia/shared';
import { Banner, Body, Button, Card, Heading, Muted, PressableCard, Screen, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { spacing } from '@/theme';
import { ClientForm } from '@/components/client-sheet';
export { RouteError as ErrorBoundary } from '@/components/route-error';

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery(() => api.customers.get(id), [id], `customer:${id}`);
  useFocusEffect(React.useCallback(() => { void query.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]));
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const customer = query.data?.customer;
  async function contact(url: string) {
    try { await Linking.openURL(url); } catch { setActionError('Cette action n’est pas disponible sur cet appareil.'); }
  }
  if (editing && customer) return <ClientForm initialCustomer={customer} submitLabel="Enregistrer les modifications" onCancel={() => setEditing(false)} onCreated={() => { setEditing(false); void query.reload(); }} />;
  return <Screen>
    {query.error ? <><Banner tone="danger" title={query.error} /><Button title="Réessayer" onPress={() => void query.reload()} /></> : null}
    {actionError ? <Banner tone="danger" title={actionError} onDismiss={() => setActionError(null)} /> : null}
    {!customer && query.loading ? <><Skeleton height={100} /><Skeleton height={180} /></> : null}
    {customer && query.data ? <>
      <Heading>{customer.displayName}</Heading>
      <Button title="Modifier le client" variant="secondary" onPress={() => setEditing(true)} />
      <Card style={{ gap: spacing.sm }}>
        {customer.companyName ? <Body>{customer.companyName}</Body> : null}
        <Body>{[customer.addressLine1, customer.postalCode, customer.city].filter(Boolean).join(', ') || 'Adresse non renseignée'}</Body>
        {customer.phone ? <Button title={customer.phone} variant="secondary" icon="call-outline" onPress={() => void contact(`tel:${customer.phone}`)} /> : null}
        {customer.phone ? <Button title="Envoyer un SMS" variant="ghost" onPress={() => void contact(`sms:${customer.phone}`)} /> : null}
        {customer.email ? <Button title={customer.email} variant="secondary" icon="mail-outline" onPress={() => void contact(`mailto:${customer.email}`)} /> : null}
        <Muted>Client depuis le {new Date(customer.createdAt).toLocaleDateString('fr-FR')}</Muted>
        {customer.notes ? <Body>{customer.notes}</Body> : null}
        {customer.tags.length ? <Muted>{customer.tags.join(' · ')}</Muted> : null}
      </Card>
      <Button title="Créer un devis pour ce client" icon="add" onPress={() => router.push({ pathname: '/devis/nouveau', params: { customerId: id } })} />
      <Heading>Historique commercial</Heading>
      <Card style={{ gap: spacing.sm }}>
        <Body>{query.data.stats.quoteCount} devis · {query.data.stats.jobCount} chantiers</Body>
        <Body>{formatCents(query.data.quotes.reduce((sum, quote) => sum + quote.totalCents, 0))} au total devisé</Body>
        <Muted>{formatCents(query.data.quotes.filter(quote => quote.status === 'ACCEPTE').reduce((sum, quote) => sum + quote.totalCents, 0))} de devis acceptés dans l’historique (pas des paiements encaissés)</Muted>
        <Body>{formatCents(query.data.stats.revenueCents)} de devis envoyés</Body>
        <Muted>{formatCents(query.data.stats.pendingCents)} en attente</Muted>
      </Card>
      {query.data.quotes.length === 0 ? <Muted>Aucun devis pour ce client. Préparez son premier devis ci-dessus.</Muted> : null}
      {query.data.quotes.map(quote => <PressableCard key={quote.id} accessibilityLabel={`Ouvrir le devis ${quote.number}`} onPress={() => router.push({ pathname: '/devis/[id]', params: { id: quote.id } })}>
        <View style={{ gap: spacing.sm }}><Body>{quote.number} · {quote.title}</Body><Body>{formatCents(quote.totalCents)}</Body><Muted>{({ BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', CONSULTE: 'Consulté', ACCEPTE: 'Accepté', REFUSE: 'Refusé', EXPIRE: 'Expiré', ANNULE: 'Annulé', MODIFICATION_DEMANDEE: 'Modification demandée' } as Record<string, string>)[quote.status] ?? 'À vérifier'}</Muted><Muted>{quote.sentAt ? `Envoyé le ${new Date(quote.sentAt).toLocaleDateString('fr-FR')}` : 'Non envoyé'}</Muted></View>
      </PressableCard>)}
      {query.data.jobs?.length ? <>
        <Heading>Chantiers</Heading>
        <Muted>Les 30 chantiers les plus récents.</Muted>
        {query.data.jobs.map(job => <Card key={job.id} style={{ gap: spacing.sm }}>
          <Body>{job.title}</Body>
          <Muted>{job.completedAt ? `Terminé le ${new Date(job.completedAt).toLocaleDateString('fr-FR')}` : job.scheduledAt ? `Prévu le ${new Date(job.scheduledAt).toLocaleDateString('fr-FR')}` : 'Date non renseignée'}</Muted>
        </Card>)}
      </> : null}
      <Heading>Activité du client</Heading>
      <Muted>Les 30 événements de devis les plus récents. Une consultation enregistrée ne prouve pas la lecture de l’email.</Muted>
      {query.data.activity?.map(event => <PressableCard key={event.id} accessibilityLabel={`Voir ${event.quoteNumber}`} onPress={() => router.push({ pathname: '/devis/[id]', params: { id: event.quoteId } })}>
        <View style={{ gap: spacing.sm }}>
          <Body>{({ CREE: 'Devis créé', MODIFIE: 'Devis modifié', ENVOYE: 'Devis marqué envoyé', CONSULTE: 'Devis consulté', ACCEPTE: 'Devis accepté', REFUSE: 'Devis refusé', MODIFICATION_DEMANDEE: 'Modification demandée', RELANCE: 'Relance enregistrée', PDF_TELECHARGE: 'PDF téléchargé', ANNULE: 'Devis annulé' } as Record<string, string>)[event.type] ?? 'Activité enregistrée'} · {event.quoteNumber}</Body>
          <Muted>{new Date(event.at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</Muted>
        </View>
      </PressableCard>)}
      <Muted>Client créé le {new Date(customer.createdAt).toLocaleDateString('fr-FR')}</Muted>
    </> : null}
  </Screen>;
}
