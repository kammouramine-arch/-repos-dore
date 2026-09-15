import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuthField, AuthHeading, AuthScreen, Entrance, Notice, PrimaryAction, StepProgress, TextAction } from '@/components/auth-kit';
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
 * Onboarding après une connexion Apple ou Google : la suite du même écran.
 *
 * Le compte existe et l'adresse est vérifiée par le fournisseur ; il manque
 * seulement ce que DEVISERA ne peut pas deviner : le nom de l'entreprise, et
 * le métier pour préparer de meilleurs devis. Le nom de la personne arrive
 * pré-rempli quand le fournisseur l'a transmis. L'appel serveur est inchangé.
 */
export default function BienvenueScreen() {
  const router = useRouter();
  const session = useSession();
  const { completeOnboarding, signOut } = useAuth();
  const locale = useMobileLocale();
  const en = locale === 'en';
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
  const ready = form.companyName.trim().length >= 2;

  return (
    <AuthScreen
      footer={(
        <Entrance index={9}>
          <PrimaryAction title={en ? 'Open my workspace' : 'Ouvrir mon atelier'} loading={busy} disabled={!ready} onPress={() => void submit()} />
          <TextAction prefix={en ? `Signed in as ${session.user.email}.` : `Connecté avec ${session.user.email}.`} label={en ? 'Change' : 'Changer'} disabled={busy} onPress={() => void signOut()} />
        </Entrance>
      )}
    >
      <View style={{ paddingTop: spacing.sm, gap: spacing['2xl'], paddingBottom: spacing.lg }}>
        <Entrance index={0}>
          <StepProgress step={2} total={2} label={en ? 'Step 2 of 2 · Your business' : 'Étape 2 sur 2 · Votre entreprise'} />
        </Entrance>
        <AuthHeading
          index={1}
          title={greeting}
          subtitle={en ? 'Tell us about your business. It appears on every quote you send.' : 'Parlez-nous de votre entreprise : elle figure sur chaque devis envoyé.'}
        />
        <View style={{ gap: spacing.lg }}>
          {error ? <Notice tone="danger" title={error} onDismiss={() => setError(null)} /> : null}
          <Entrance index={3}>
            <AuthField
              label={en ? 'Business name' : 'Nom de votre entreprise'}
              value={form.companyName}
              onChangeText={update('companyName')}
              placeholder="Plomberie Martin"
              autoComplete="organization"
              autoFocus
              editable={!busy}
              returnKeyType="next"
            />
          </Entrance>
          <Entrance index={4}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AuthField label={en ? 'First name' : 'Prénom'} value={form.firstName} onChangeText={update('firstName')} autoComplete="given-name" editable={!busy} />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField label={en ? 'Last name' : 'Nom'} value={form.lastName} onChangeText={update('lastName')} autoComplete="family-name" editable={!busy} />
              </View>
            </View>
          </Entrance>
          <Entrance index={5}>
            <AuthField
              label={en ? 'Phone' : 'Téléphone'}
              hint={en ? 'optional' : 'facultatif'}
              value={form.phone}
              onChangeText={update('phone')}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!busy}
            />
          </Entrance>
          <Entrance index={6}>
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.inkSoft }}>{en ? 'Your trade' : 'Votre métier'}</Text>
                <Text style={{ fontSize: 12.5, color: colors.subtle }}>{en ? 'optional' : 'facultatif'}</Text>
              </View>
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
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        height: 38,
                        justifyContent: 'center',
                        borderRadius: radius.full,
                        backgroundColor: selected ? colors.accent : pressed ? colors.surface2 : colors.surface,
                        borderWidth: 1,
                        borderColor: selected ? colors.accent : 'transparent',
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.white : colors.inkSoft }}>{en ? trade.en : trade.fr}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Entrance>
        </View>
      </View>
    </AuthScreen>
  );
}
