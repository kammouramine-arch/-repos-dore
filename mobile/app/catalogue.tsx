import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError, formatCents, type PriceBookItemDTO } from '@devisia/shared';
import {
  Banner,
  Body,
  Button,
  Caption,
  Card,
  ChoiceRow,
  Divider,
  EmptyState,
  Field,
  Ionicons,
  ListRow,
  LoadingState,
  SearchField,
  SectionHeader,
  Title,
} from '@/components/ui';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

/**
 * Catalogue de prix, natif.
 *
 * L'écran « Plus » renvoyait ici vers le navigateur, qui redemandait une
 * connexion : l'artisan se retrouvait devant un formulaire au lieu de ses
 * prix. Le catalogue conditionne pourtant la justesse de chaque devis — c'est
 * exactement ce qu'on veut corriger sur un chantier, entre deux
 * interventions.
 */
type Kind = 'MAIN_OEUVRE' | 'MATERIAU' | 'FORFAIT' | 'DEPLACEMENT' | 'AUTRE';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'MAIN_OEUVRE', label: 'Main-d’œuvre' },
  { value: 'MATERIAU', label: 'Matériau' },
  { value: 'FORFAIT', label: 'Forfait' },
  { value: 'DEPLACEMENT', label: 'Déplacement' },
];

interface Draft {
  id: string | null;
  name: string;
  category: Kind;
  unit: string;
  salePrice: string;
  vatRate: string;
}

const BLANK: Draft = {
  id: null,
  name: '',
  category: 'MAIN_OEUVRE',
  unit: 'u',
  salePrice: '',
  vatRate: '20',
};

export default function CatalogueScreen() {
  const [items, setItems] = React.useState<PriceBookItemDTO[] | null>(null);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (term: string) => {
    setError(null);
    try {
      setItems(await api.priceBook.list(term || undefined));
    } catch (cause) {
      setItems([]);
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'Le catalogue n’a pas pu être chargé.',
      );
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => void load(search), search ? 260 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  async function save() {
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      setError('Donnez un nom à cette prestation.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      unit: draft.unit.trim() || 'u',
      salePriceCents: Math.round((Number(draft.salePrice.replace(',', '.')) || 0) * 100),
      vatRate: Number(draft.vatRate.replace(',', '.')) || 20,
    };
    try {
      if (draft.id) await api.priceBook.update(draft.id, payload);
      else await api.priceBook.create(payload);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDraft(null);
      await load(search);
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'Cet article n’a pas pu être enregistré.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.priceBook.remove(id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDraft(null);
      await load(search);
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'Cet article n’a pas pu être supprimé.',
      );
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une prestation ou un matériau"
        />
        {error ? <Banner tone="danger" title={error} onDismiss={() => setError(null)} /> : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {items === null ? <LoadingState label="Chargement de votre catalogue…" /> : null}

        {items?.length === 0 ? (
          <View style={{ padding: spacing.lg }}>
            <EmptyState
              icon="book-outline"
              title={search ? 'Aucun article ne correspond' : 'Votre catalogue est vide'}
              description={
                search
                  ? 'Essayez un autre mot, ou créez cette prestation.'
                  : 'Ajoutez vos prestations courantes : DEVISIA les appliquera en priorité dans chaque devis, au lieu d’estimer.'
              }
              action={
                <Button
                  title="Ajouter une prestation"
                  icon="add"
                  onPress={() => setDraft({ ...BLANK, name: search.trim() })}
                />
              }
            />
          </View>
        ) : null}

        {items && items.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <SectionHeader title={`${items.length} article${items.length > 1 ? 's' : ''}`} />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {items.map((item, index) => (
                <ListRow
                  key={item.id}
                  title={item.name}
                  subtitle={`${KINDS.find((k) => k.value === item.category)?.label ?? item.category} · par ${item.unit}`}
                  value={formatCents(item.salePriceCents)}
                  last={index === items.length - 1}
                  onPress={() =>
                    setDraft({
                      id: item.id,
                      name: item.name,
                      category: item.category as Kind,
                      unit: item.unit,
                      salePrice: (item.salePriceCents / 100).toFixed(2),
                      vatRate: String(item.vatRate),
                    })
                  }
                />
              ))}
            </Card>
            <Caption style={{ color: colors.subtle }}>
              Ces prix servent de référence à chaque devis préparé par DEVISIA.
            </Caption>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: spacing.lg,
          paddingBottom: spacing['2xl'],
          backgroundColor: colors.canvas,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        }}
      >
        <Button title="Nouvelle prestation" icon="add" haptic onPress={() => setDraft(BLANK)} />
      </View>

      <Modal
        visible={draft !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDraft(null)}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.canvas }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
              }}
            >
              <Title>{draft?.id ? 'Modifier' : 'Nouvelle prestation'}</Title>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setDraft(null)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {error ? <Banner tone="danger" title={error} /> : null}
              <Field
                label="Nom"
                value={draft?.name ?? ''}
                onChangeText={(name) => setDraft((d) => (d ? { ...d, name } : d))}
                placeholder="Main-d’œuvre plombier"
                autoFocus={!draft?.id}
              />
              <View style={{ gap: spacing.sm }}>
                <Body style={{ fontWeight: '600', fontSize: 13 }}>Catégorie</Body>
                <ChoiceRow
                  options={KINDS}
                  value={draft?.category ?? null}
                  onChange={(category) => setDraft((d) => (d ? { ...d, category } : d))}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Prix de vente"
                    hint="€ HT"
                    value={draft?.salePrice ?? ''}
                    onChangeText={(salePrice) => setDraft((d) => (d ? { ...d, salePrice } : d))}
                    placeholder="55.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Unité"
                    value={draft?.unit ?? ''}
                    onChangeText={(unit) => setDraft((d) => (d ? { ...d, unit } : d))}
                    placeholder="h, u, m²"
                  />
                </View>
              </View>
              <Field
                label="TVA"
                hint="%"
                value={draft?.vatRate ?? ''}
                onChangeText={(vatRate) => setDraft((d) => (d ? { ...d, vatRate } : d))}
                placeholder="20"
                keyboardType="decimal-pad"
              />

              <Button title="Enregistrer" loading={saving} haptic onPress={() => void save()} />

              {draft?.id ? (
                <>
                  <Divider />
                  <Button
                    title="Supprimer cet article"
                    variant="ghost"
                    icon="trash-outline"
                    onPress={() => void remove(draft.id as string)}
                  />
                </>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
