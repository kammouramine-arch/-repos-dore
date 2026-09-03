import * as React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError, type CustomerDTO } from '@devisia/shared';
import {
  Banner,
  Button,
  Caption,
  Heading,
  Ionicons,
  ListRow,
  LoadingState,
  Muted,
  SearchField,
  Title,
} from '@/components/ui';
import { ClientForm } from '@/components/client-sheet';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

/**
 * Choix du client, avec création sur place.
 *
 * L'écran précédent demandait « Choisissez le client avant d'enregistrer »,
 * puis répondait « Introuvable » — alors qu'un devis est très souvent le
 * premier contact avec un nouveau client. L'artisan devait abandonner son
 * devis, aller créer la fiche, puis tout recommencer.
 *
 * Ici, l'absence de résultat n'est pas une impasse : c'est l'endroit exact où
 * l'on propose de créer la fiche, pré-remplie avec ce qui vient d'être tapé.
 */
export function ClientPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerDTO) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<CustomerDTO[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async (term: string) => {
    setError(null);
    try {
      setItems((await api.customers.list(term || undefined)).items);
    } catch (cause) {
      setItems([]);
      setError(cause instanceof DevisiaApiError ? cause.message : 'Chargement impossible.');
    }
  }, []);

  React.useEffect(() => {
    if (!visible) return undefined;
    // Une frappe déclenche une requête : on laisse le doigt finir sa phrase.
    const timer = setTimeout(() => void load(search), search ? 280 : 0);
    return () => clearTimeout(timer);
  }, [visible, search, load]);

  // La remise à zéro appartient à la fermeture, pas à un effet : la déclencher
  // depuis un effet provoquerait un rendu en cascade à chaque ouverture.
  const close = React.useCallback(() => {
    setSearch('');
    setItems(null);
    setCreating(false);
    setError(null);
    onClose();
  }, [onClose]);

  const trimmed = search.trim();
  const noMatch = items !== null && items.length === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <Title>{creating ? 'Nouveau client' : 'Client'}</Title>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </Pressable>
        </View>

        {creating ? (
          <ClientForm
            initialName={trimmed}
            submitLabel="Créer et continuer"
            onCreated={onSelect}
            onCancel={() => setCreating(false)}
            cancelLabel="Retour à la recherche"
          />
        ) : (
          <>
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <SearchField
                value={search}
                onChangeText={setSearch}
                placeholder="Nom, téléphone ou email"
                autoFocus
              />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
              {items === null ? <LoadingState label="Chargement de vos clients…" /> : null}

              {noMatch ? (
                <View style={{ padding: spacing.lg, gap: spacing.lg }}>
                  <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radius.full,
                        backgroundColor: colors.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="person-add-outline" size={22} color={colors.accent} />
                    </View>
                    <Heading>
                      {trimmed ? 'Aucun client à ce nom' : 'Aucun client enregistré'}
                    </Heading>
                    <Muted style={{ textAlign: 'center' }}>
                      C’est souvent le cas d’un nouveau chantier. Créez la fiche en quelques
                      secondes.
                    </Muted>
                  </View>
                  <Button
                    title={trimmed ? `Créer « ${trimmed} »` : 'Créer un client'}
                    icon="add"
                    haptic
                    onPress={() => setCreating(true)}
                  />
                </View>
              ) : null}

              {items?.map((customer, index) => (
                <ListRow
                  key={customer.id}
                  title={customer.displayName}
                  subtitle={customer.phone ?? customer.email ?? customer.city ?? null}
                  icon="person-outline"
                  last={index === items.length - 1}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onSelect(customer);
                  }}
                />
              ))}

              {items && items.length > 0 ? (
                <View style={{ padding: spacing.lg }}>
                  <Button
                    title={trimmed ? `Créer « ${trimmed} »` : 'Nouveau client'}
                    variant="secondary"
                    icon="add"
                    onPress={() => setCreating(true)}
                  />
                </View>
              ) : null}

              {error && !creating ? (
                <View style={{ padding: spacing.lg }}>
                  <Banner tone="danger" title={error} />
                </View>
              ) : null}

              <View style={{ paddingHorizontal: spacing.lg }}>
                <Caption style={{ color: colors.subtle }}>
                  Le client est rattaché au devis dès sa création.
                </Caption>
              </View>
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
