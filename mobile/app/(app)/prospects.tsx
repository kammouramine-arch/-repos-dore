import * as React from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEAD_STATUS_LABELS, formatCents, type LeadDTO } from '@devisia/shared';
import { Badge, Body, Divider, EmptyState, Muted, Skeleton, Title } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'info'> = {
  NOUVEAU: 'accent',
  CONTACTE: 'info',
  QUALIFIE: 'info',
  DEVIS_ENVOYE: 'neutral',
  RELANCE: 'warning',
  GAGNE: 'success',
  PERDU: 'neutral',
};

/** Pipeline commercial : répondre vite est ce qui fait gagner le chantier. */
export default function ProspectsScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const query = useQuery<LeadDTO[]>(() => api.leads.list());

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function convert(lead: LeadDTO) {
    try {
      await api.leads.convert(lead.id);
      toast({ title: 'Prospect converti', description: 'Client et chantier créés.' });
      await query.reload();
    } catch {
      toast({ title: 'Conversion impossible', tone: 'error' });
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ padding: spacing.lg }}>
        <Title>Prospects</Title>
        {/* « 0 demandes en cours de traitement » n'apprend rien : quand il n'y
            a rien, l'état vide dit déjà tout, et mieux. */}
        {(query.data?.length ?? 0) > 0 ? (
          <Muted>
            {query.data!.length} demande{query.data!.length > 1 ? 's' : ''} en attente de réponse.
          </Muted>
        ) : (
          <Muted>Les demandes de devis reçues arrivent ici.</Muted>
        )}
      </View>

      {query.loading && !query.data ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={78} />
          ))}
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['4xl'] }}
          ItemSeparatorComponent={() => <Divider />}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh()} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Aucun prospect pour le moment."
              description="Les demandes reçues depuis votre formulaire public arrivent directement ici."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                Alert.alert(item.contactName, item.description ?? item.title, [
                  { text: 'Fermer', style: 'cancel' },
                  ...(item.customerId
                    ? [{ text: 'Créer un devis', onPress: () => router.push('/devis/nouveau') }]
                    : [{ text: 'Convertir en client', onPress: () => void convert(item) }]),
                ])
              }
              style={({ pressed }) => ({ paddingVertical: spacing.md, opacity: pressed ? 0.7 : 1, gap: 6 })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                <Body style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {item.contactName}
                </Body>
                {item.estimatedCents ? (
                  <Body style={{ fontWeight: '600' }}>{formatCents(item.estimatedCents, { compact: true })}</Body>
                ) : null}
              </View>
              <Muted numberOfLines={2}>{item.title}</Muted>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Badge label={LEAD_STATUS_LABELS[item.status]} tone={TONES[item.status] ?? 'neutral'} />
                {item.phone ? <Muted style={{ fontSize: 12 }}>{item.phone}</Muted> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
