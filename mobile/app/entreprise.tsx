import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError, type BusinessProfileDTO } from '@devisia/shared';
import {
  Banner,
  Button,
  Caption,
  Card,
  ErrorState,
  Field,
  LoadingState,
  Muted,
  SectionHeader,
  Title,
} from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

/**
 * Réglages de l'entreprise, natifs.
 *
 * Ces informations figurent sur chaque devis envoyé : nom, coordonnées, SIRET,
 * mentions légales, taux par défaut. Les rendre accessibles seulement depuis
 * un navigateur revenait à dire que l'application mobile ne sait pas produire
 * un devis complet. Les champs et la validation sont exactement ceux du web.
 */
type Form = Record<string, string>;

function toForm(profile: BusinessProfileDTO): Form {
  return {
    legalName: profile.legalName ?? '',
    ownerName: profile.ownerName ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    website: profile.website ?? '',
    addressLine1: profile.addressLine1 ?? '',
    postalCode: profile.postalCode ?? '',
    city: profile.city ?? '',
    siret: profile.siret ?? '',
    vatNumber: profile.vatNumber ?? '',
    insurance: profile.insurance ?? '',
    defaultHourlyRate: (profile.defaultHourlyCents / 100).toFixed(2),
    defaultVatRate: String(profile.defaultVatRate),
    quoteValidityDays: String(profile.quoteValidityDays),
    paymentTerms: profile.paymentTerms ?? '',
    quoteTerms: profile.quoteTerms ?? '',
    quoteFooter: profile.quoteFooter ?? '',
  };
}

export default function EntrepriseScreen() {
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<BusinessProfileDTO | null>(null);
  const [form, setForm] = React.useState<Form | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const next = await api.organisation.profile();
      setProfile(next);
      setForm(toForm(next));
    } catch (cause) {
      setLoadError(
        cause instanceof DevisiaApiError
          ? cause.message
          : 'Vos informations n’ont pas pu être chargées.',
      );
    }
  }, []);

  React.useEffect(() => {
    // Chargement initial : poser l'état est le rôle de cet effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const set = (key: string) => (value: string) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  async function save() {
    if (!form || !profile) return;
    if (form.legalName.trim().length < 2) {
      setError('Le nom de l’entreprise est nécessaire : il figure sur chaque devis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await api.organisation.save({
        ...profile,
        legalName: form.legalName.trim(),
        ownerName: form.ownerName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        postalCode: form.postalCode.trim() || null,
        city: form.city.trim() || null,
        siret: form.siret.trim() || null,
        vatNumber: form.vatNumber.trim() || null,
        insurance: form.insurance.trim() || null,
        defaultHourlyCents: Math.round((Number(form.defaultHourlyRate.replace(',', '.')) || 0) * 100),
        defaultVatRate: Number(form.defaultVatRate.replace(',', '.')) || 20,
        quoteValidityDays: Number(form.quoteValidityDays) || 30,
        paymentTerms: form.paymentTerms.trim() || null,
        quoteTerms: form.quoteTerms.trim() || null,
        quoteFooter: form.quoteFooter.trim() || null,
      });
      setProfile(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: 'Informations enregistrées' });
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError
          ? cause.message
          : 'L’enregistrement n’a pas abouti. Vos saisies sont conservées.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
        <ErrorState description={loadError} onRetry={() => void load()} />
      </SafeAreaView>
    );
  }

  if (!form) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
        <LoadingState label="Chargement de vos informations…" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Title>Mon entreprise</Title>
          <Muted>Ces informations apparaissent sur chacun de vos devis.</Muted>
        </View>

        {error ? <Banner tone="danger" title={error} onDismiss={() => setError(null)} /> : null}

        <Card style={{ gap: spacing.lg }}>
          <SectionHeader title="Identité" />
          <Field label="Nom de l’entreprise" value={form.legalName} onChangeText={set('legalName')} />
          <Field
            label="Responsable"
            hint="facultatif"
            value={form.ownerName}
            onChangeText={set('ownerName')}
          />
          <Field label="SIRET" hint="facultatif" value={form.siret} onChangeText={set('siret')} keyboardType="number-pad" />
          <Field label="N° de TVA" hint="facultatif" value={form.vatNumber} onChangeText={set('vatNumber')} />
          <Field
            label="Assurance décennale"
            hint="mentionnée sur le devis"
            value={form.insurance}
            onChangeText={set('insurance')}
          />
        </Card>

        <Card style={{ gap: spacing.lg }}>
          <SectionHeader title="Coordonnées" />
          <Field
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field label="Téléphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Field label="Adresse" value={form.addressLine1} onChangeText={set('addressLine1')} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Code postal" value={form.postalCode} onChangeText={set('postalCode')} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Ville" value={form.city} onChangeText={set('city')} />
            </View>
          </View>
          <Field
            label="Site web"
            hint="facultatif"
            value={form.website}
            onChangeText={set('website')}
            autoCapitalize="none"
          />
        </Card>

        <Card style={{ gap: spacing.lg }}>
          <SectionHeader title="Valeurs par défaut des devis" />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Taux horaire"
                hint="€ HT"
                value={form.defaultHourlyRate}
                onChangeText={set('defaultHourlyRate')}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="TVA"
                hint="%"
                value={form.defaultVatRate}
                onChangeText={set('defaultVatRate')}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Field
            label="Validité du devis"
            hint="jours"
            value={form.quoteValidityDays}
            onChangeText={set('quoteValidityDays')}
            keyboardType="number-pad"
          />
          <Caption style={{ color: colors.subtle }}>
            Le taux horaire sert de référence quand une prestation n’est pas dans votre catalogue.
          </Caption>
        </Card>

        <Card style={{ gap: spacing.lg }}>
          <SectionHeader title="Mentions" />
          <Field
            label="Conditions de paiement"
            value={form.paymentTerms}
            onChangeText={set('paymentTerms')}
            placeholder="Acompte de 30 % à la commande, solde à la fin des travaux."
            multiline
          />
          <Field
            label="Conditions générales"
            value={form.quoteTerms}
            onChangeText={set('quoteTerms')}
            multiline
          />
          <Field
            label="Pied de page du devis"
            value={form.quoteFooter}
            onChangeText={set('quoteFooter')}
            multiline
          />
        </Card>

        <Button title="Enregistrer" loading={saving} haptic onPress={() => void save()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
