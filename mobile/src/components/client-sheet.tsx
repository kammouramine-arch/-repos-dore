import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError, type CustomerDTO } from '@devisia/shared';
import { Banner, Button, Field, Ionicons, Muted, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

/**
 * Création d'une fiche client.
 *
 * Le même formulaire sert au répertoire et à la sélection pendant un devis :
 * un artisan ne doit pas rencontrer deux façons différentes d'enregistrer un
 * client selon l'endroit d'où il part.
 */
export interface ClientDraft {
  lastName: string;
  phone: string;
  email: string;
}

const BLANK: ClientDraft = { lastName: '', phone: '', email: '' };

/** Formulaire seul, sans habillage : le parent décide de la présentation. */
export function ClientForm({
  initialName = '',
  submitLabel,
  onCreated,
  onCancel,
  cancelLabel,
}: {
  initialName?: string;
  submitLabel: string;
  onCreated: (customer: CustomerDTO) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [form, setForm] = React.useState<ClientDraft>({ ...BLANK, lastName: initialName });
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const name = form.lastName.trim();
    if (name.length < 2) {
      setError('Indiquez au moins le nom du client.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const customer = await api.customers.create({
        lastName: name,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated(customer);
    } catch (cause) {
      setError(cause instanceof DevisiaApiError ? cause.message : 'Le client n’a pas pu être créé.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Muted>Le minimum suffit : vous compléterez la fiche plus tard.</Muted>
      {error ? <Banner tone="danger" title={error} onDismiss={() => setError(null)} /> : null}
      <Field
        label="Nom du client"
        value={form.lastName}
        onChangeText={(lastName) => setForm((f) => ({ ...f, lastName }))}
        placeholder="Dupont"
        autoFocus
        autoCapitalize="words"
      />
      <Field
        label="Téléphone"
        hint="facultatif"
        value={form.phone}
        onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
        placeholder="06 12 34 56 78"
        keyboardType="phone-pad"
      />
      <Field
        label="Email"
        hint="pour envoyer le devis"
        value={form.email}
        onChangeText={(email) => setForm((f) => ({ ...f, email }))}
        placeholder="client@exemple.fr"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title={submitLabel} loading={saving} haptic onPress={() => void submit()} />
      {onCancel ? (
        <Button title={cancelLabel ?? 'Annuler'} variant="ghost" onPress={onCancel} />
      ) : null}
    </ScrollView>
  );
}

/** Le même formulaire présenté en feuille, depuis le répertoire. */
export function ClientSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (customer: CustomerDTO) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            <Title>Nouveau client</Title>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          {/* Remonter la clé remet le formulaire à zéro d'une ouverture à l'autre. */}
          <ClientForm
            key={visible ? 'ouvert' : 'ferme'}
            submitLabel="Enregistrer le client"
            onCreated={onCreated}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
