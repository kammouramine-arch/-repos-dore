import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError, type CustomerDTO } from '@devisia/shared';
import { Banner, Button, Field, Ionicons, Muted, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';
import { useMobileLocale } from '@/lib/i18n';

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
  firstName: string;
  companyName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  notes: string;
}

const BLANK: ClientDraft = { lastName: '', phone: '', email: '', firstName: '', companyName: '', addressLine1: '', postalCode: '', city: '', notes: '' };

/** Formulaire seul, sans habillage : le parent décide de la présentation. */
export function ClientForm({
  initialName = '',
  submitLabel,
  onCreated,
  onCancel,
  cancelLabel,
  initialCustomer,
}: {
  initialCustomer?: CustomerDTO & { notes?: string | null };
  initialName?: string;
  submitLabel: string;
  onCreated: (customer: CustomerDTO) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [form, setForm] = React.useState<ClientDraft>(() => initialCustomer ? Object.fromEntries(Object.keys(BLANK).map(key => [key, initialCustomer[key as keyof typeof initialCustomer] ?? ''])) as unknown as ClientDraft : { ...BLANK, lastName: initialName });
  const submitting = React.useRef(false);
  const [detailsOpen, setDetailsOpen] = React.useState(Boolean(initialCustomer));
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    if (submitting.current) return;
    const name = form.lastName.trim();
    if (name.length < 2 && form.firstName.trim().length < 2 && form.companyName.trim().length < 2) {
      setError('Indiquez au moins le nom du client.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const input = {
        ...form,
        lastName: name,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      };
      const customer = initialCustomer ? await api.customers.update(initialCustomer.id, input) : await api.customers.create(input);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated(customer);
    } catch (cause) {
      setError(cause instanceof DevisiaApiError ? cause.message : 'Le client n’a pas pu être créé.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Muted>Coordonnées et informations utiles pour vos prochains devis.</Muted>
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
      <Button title={detailsOpen ? 'Masquer les informations complémentaires' : 'Compléter la fiche (facultatif)'} variant="ghost" onPress={() => setDetailsOpen(value => !value)} />
      {detailsOpen && (['firstName', 'companyName', 'addressLine1', 'postalCode', 'city', 'notes'] as const).map(key => <Field key={key} label={{ firstName: 'Prénom', companyName: 'Entreprise', addressLine1: 'Adresse', postalCode: 'Code postal', city: 'Ville', notes: 'Notes' }[key]} value={form[key]} onChangeText={value => setForm(current => ({ ...current, [key]: value }))} multiline={key === 'notes'} />)}
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
  const locale = useMobileLocale();
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
            <Pressable accessibilityRole="button" accessibilityLabel={locale === 'en' ? 'Close' : 'Fermer'} onPress={onClose} hitSlop={10}>
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
