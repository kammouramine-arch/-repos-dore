import * as React from 'react';
import { KeyboardAvoidingView, Linking, Platform, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Banner, Button, Card, Field, Heading, Muted, Screen } from '@/components/ui';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { mobileLocale } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

const SUPPORT_EMAIL = 'contact@devisera.fr';

/**
 * Suppression du compte : un écran à part, lisible et sans précipitation.
 *
 * L'action était un bouton rouge au bas d'une longue carte de réglages. Elle
 * mérite un écran qui dit ce qui va se passer, demande le mot de passe, et
 * offre une porte de sortie. L'appel d'API et la déconnexion sont inchangés.
 */
export default function SuppressionScreen() {
  const session = useSession();
  const { signOut } = useAuth();
  const en = mobileLocale(session) === 'en';
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const acting = React.useRef(false);

  const consequences = [
    { icon: 'card-outline' as const, text: en ? 'Deleting your account does not cancel an Apple subscription. Cancel it in Apple subscription settings first. For web billing, use the billing portal before deleting.' : 'La suppression du compte ne résilie pas un abonnement Apple. Résiliez-le d’abord dans les réglages Apple. Pour un abonnement web, utilisez le portail de facturation avant la suppression.' },
    { icon: 'lock-closed-outline' as const, text: en ? 'Your access is disabled and all sessions are signed out.' : 'Votre accès est désactivé et toutes vos sessions sont fermées.' },
    { icon: 'eye-off-outline' as const, text: en ? 'Your personal information is anonymised.' : 'Vos informations personnelles sont anonymisées.' },
    { icon: 'archive-outline' as const, text: en ? 'Business records may be kept where the law or another team member requires it.' : 'Les données commerciales peuvent être conservées lorsqu’une obligation légale ou un autre membre de l’entreprise l’exige.' },
  ];

  async function remove() {
    if (acting.current) return;
    acting.current = true; setBusy(true); setError(null);
    try {
      const result = await api.auth.deleteAccount(password);
      setPassword('');
      setNotice(result.businessRecordsRetained
        ? (en ? 'Your access has been deleted. Business records are kept as required.' : 'Votre accès a été supprimé. Les données commerciales restent conservées selon les obligations applicables.')
        : (en ? 'Your account has been deleted.' : 'Votre compte a été supprimé.'));
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Try again in a moment.' : 'Réessayez dans un instant.'));
    } finally { acting.current = false; setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm }}>
          <View style={{ width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={26} color={colors.danger} />
          </View>
          <Heading style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }}>{en ? 'Delete my account' : 'Supprimer mon compte'}</Heading>
          <Muted style={{ textAlign: 'center' }}>{en ? 'This action is permanent. Here is exactly what happens.' : 'Cette action est définitive. Voici précisément ce qui se passe.'}</Muted>
        </View>

        <Card style={{ gap: spacing.lg }}>
          {consequences.map((item) => (
            <View key={item.icon} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon} size={17} color={colors.inkSoft} />
              </View>
              <Text style={[typography.body, { flex: 1, color: colors.inkSoft }]}>{item.text}</Text>
            </View>
          ))}
        </Card>

        {error ? <Banner tone="danger" title={error} onDismiss={() => setError(null)} /> : null}
        {notice ? <Banner tone="success" title={notice} /> : null}

        <Card style={{ gap: spacing.lg }}>
          <Field label={en ? 'Current password' : 'Mot de passe actuel'} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy} />
          <Button title={en ? 'Permanently delete my access' : 'Supprimer définitivement mon accès'} variant="danger" haptic loading={busy} disabled={busy || !password} onPress={() => void remove()} />
        </Card>

        <View style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Muted style={{ textAlign: 'center' }}>{en ? 'To request a copy of your data or ask a question first, write to us.' : 'Pour demander une copie de vos données ou poser une question avant, écrivez-nous.'}</Muted>
          <Button title={SUPPORT_EMAIL} variant="ghost" icon="mail-outline" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('DEVISERA — mon compte')}`).catch(() => undefined)} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
