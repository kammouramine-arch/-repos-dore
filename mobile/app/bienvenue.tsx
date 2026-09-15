import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Banner, Button, Card, Field, Heading, Muted } from '@/components/ui';
import { Logo } from '@/components/logo';
import { useAuth, useSession } from '@/lib/auth';
import { useMobileLocale } from '@/lib/i18n';
import { authDestination } from '@/lib/auth-navigation';
import { colors, radius, spacing } from '@/theme';

const TRADES: { id: string; fr: string; en: string }[] = [
  { id: 'PLOMBIER', fr: 'Plomberie', en: 'Plumbing' },
  { id: 'ELECTRICIEN', fr: 'Électricité', en: 'Electrical' },
  { id: 'CHAUFFAGISTE', fr: 'Chauffage', en: 'Heating' },
  { id: 'CLIMATICIEN', fr: 'Climatisation', en: 'Air conditioning' },
  { id: 'PEINTRE', fr: 'Peinture', en: 'Painting' },
  { id: 'COUVREUR', fr: 'Couverture', en: 'Roofing' },
  { id: 'MENUISIER', fr: 'Menuiserie', en: 'Carpentry' },
  { id: 'MACON', fr: 'Maçonnerie', en: 'Masonry' },
  { id: 'PAYSAGISTE', fr: 'Paysage', en: 'Landscaping' },
  { id: 'RENOVATION', fr: 'Rénovation', en: 'Renovation' },
  { id: 'NETTOYAGE', fr: 'Nettoyage', en: 'Cleaning' },
  { id: 'DEPANNAGE', fr: 'Dépannage', en: 'Repairs' },
  { id: 'AUTRE', fr: 'Autre', en: 'Other' },
];

/**
 * Onboarding après une connexion Apple ou Google.
 *
 * Le compte existe et l'adresse est vérifiée par le fournisseur ; il manque
 * seulement ce que DEVISERA ne peut pas deviner : le nom de l'entreprise, et
 * le métier pour préparer de meilleurs devis. Le nom de la personne arrive
 * pré-rempli quand le fournisseur l'a transmis.
 */
export default function BienvenueScreen() {
  const router = useRouter();
  const session = useSession();
  const { completeOnboarding, signOut } = useAuth();
  const locale = useMobileLocale();
  const en = locale === 'en';
  const insets = useSafeAreaInsets();
  const [form, setForm] = React.useState({
    companyName: '',
    firstName: session.user.firstName ?? '',
    lastName: session.user.lastName ?? '',
    phone: '',
    trade: '',
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const acting = React.useRef(false);

  const update = (key: keyof typeof form) => (value: string) => {
    setError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit() {
    if (acting.current) return;
    const companyName = form.companyName.trim();
    if (companyName.length < 2) {
      setError(en ? 'Enter the name of your business.' : 'Indiquez le nom de votre entreprise.');
      return;
    }
    acting.current = true;
    setBusy(true);
    setError(null);
    try {
      const fresh = await completeOnboarding({
        companyName,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        trade: form.trade || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace(authDestination(fresh) as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Please try again in a moment.' : 'Réessayez dans un instant.'));
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }

  const greeting = session.user.firstName
    ? (en ? `Nice to meet you, ${session.user.firstName}.` : `Enchanté, ${session.user.firstName}.`)
    : (en ? 'Nice to meet you.' : 'Enchanté.');

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing['3xl'], paddingHorizontal: spacing.xl, gap: spacing.xl }}
        >
          <Logo size={34} />
          <View style={{ gap: spacing.sm }}>
            <Heading style={{ fontSize: 26, lineHeight: 32 }}>{greeting}</Heading>
            <Muted style={{ fontSize: 15, lineHeight: 22 }}>
              {en ? 'One last thing before your first quote: tell us about your business. It appears on every quote you send.' : 'Une dernière chose avant votre premier devis : parlez-nous de votre entreprise. Elle figure sur chaque devis envoyé.'}
            </Muted>
          </View>

          <Card style={{ gap: spacing.lg, padding: spacing.xl }}>
            {error ? <Banner tone="danger" title={error} /> : null}
            <Field
              label={en ? 'Business name' : 'Nom de votre entreprise'}
              value={form.companyName}
              onChangeText={update('companyName')}
              placeholder="Plomberie Martin"
              autoComplete="organization"
              autoFocus
              editable={!busy}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label={en ? 'First name' : 'Prénom'} value={form.firstName} onChangeText={update('firstName')} autoComplete="given-name" editable={!busy} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={en ? 'Last name' : 'Nom'} value={form.lastName} onChangeText={update('lastName')} autoComplete="family-name" editable={!busy} />
              </View>
            </View>
            <Field
              label={en ? 'Phone' : 'Téléphone'}
              hint={en ? 'optional' : 'facultatif'}
              value={form.phone}
              onChangeText={update('phone')}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!busy}
            />
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSoft }}>{en ? 'Your trade' : 'Votre métier'} <Text style={{ color: colors.muted, fontWeight: '400' }}>· {en ? 'optional' : 'facultatif'}</Text></Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {TRADES.map((trade) => {
                  const selected = form.trade === trade.id;
                  return (
                    <Pressable
                      key={trade.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      disabled={busy}
                      onPress={() => { void Haptics.selectionAsync().catch(() => undefined); update('trade')(selected ? '' : trade.id); }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: radius.full,
                        backgroundColor: selected ? colors.accent : colors.surface2,
                        borderWidth: 1,
                        borderColor: selected ? colors.accent : colors.line,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: selected ? colors.white : colors.ink }}>{en ? trade.en : trade.fr}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Button title={en ? 'Open my workspace' : 'Ouvrir mon atelier'} size="lg" loading={busy} onPress={() => void submit()} haptic />
          </Card>

          <View style={{ alignItems: 'center' }}>
            <Muted style={{ fontSize: 12.5, textAlign: 'center' }}>
              {en ? `Signed in as ${session.user.email}.` : `Connecté avec ${session.user.email}.`}
            </Muted>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void signOut()} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 14 }}>{en ? 'Use another account' : 'Utiliser un autre compte'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
