import * as React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Card, Muted } from '@/components/ui';
import { AuthSurface } from '@/components/auth-surface';
import { AppleContinueButton, EmailContinueButton, GoogleContinueButton } from '@/components/social-buttons';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { useMobileLocale } from '@/lib/i18n';
import { appleSignInAvailable, googleSignInAvailable } from '@/lib/social-auth';
import { authDestination } from '@/lib/auth-navigation';
import { colors, spacing } from '@/theme';

/**
 * Entrée de l'authentification : trois façons de continuer, rien d'autre.
 *
 * Apple et Google ouvrent les feuilles système et le serveur vérifie leur
 * jeton ; aucun code par email n'est demandé ensuite. L'adresse e-mail garde
 * le parcours DEVISERA existant (adresse, mot de passe, code de vérification).
 */
export default function AuthEntryScreen() {
  const locale = useMobileLocale();
  const en = locale === 'en';
  const router = useRouter();
  const { signInWithApple, signInWithGoogle, error } = useAuth();
  const [apple, setApple] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState<'apple' | 'google' | null>(null);
  const google = googleSignInAvailable();

  React.useEffect(() => {
    let disposed = false;
    void appleSignInAvailable().then((available) => { if (!disposed) setApple(available); });
    return () => { disposed = true; };
  }, []);

  async function run(provider: 'apple' | 'google', action: () => Promise<{ nextStep?: string } | null>) {
    if (busy) return;
    setBusy(provider);
    try {
      const session = await action();
      if (session) router.replace(authDestination(session as never) as never);
    } catch {
      // Le message est porté par le contexte d'authentification.
    } finally {
      setBusy(null);
    }
  }

  const legal = (path: '/conditions' | '/confidentialite') => void Linking.openURL(`${API_URL}${path}`).catch(() => undefined);

  return (
    <AuthSurface
      title={en ? 'Welcome to DEVISERA' : 'Bienvenue sur DEVISERA'}
      subtitle={en ? 'Create your workspace or pick up where you left off.' : 'Créez votre atelier ou retrouvez vos devis là où vous les avez laissés.'}
    >
      <Card style={{ gap: spacing.md, padding: spacing.xl }}>
        {error ? <Banner tone="danger" title={error} /> : null}
        {apple ? <AppleContinueButton disabled={busy !== null} onPress={() => void run('apple', signInWithApple)} /> : null}
        {google ? <GoogleContinueButton disabled={busy !== null && busy !== 'google'} loading={busy === 'google'} onPress={() => void run('google', signInWithGoogle)} /> : null}
        <EmailContinueButton disabled={busy !== null} onPress={() => router.push('/(auth)/connexion')} />
        <Muted style={{ fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: spacing.xs }}>
          {en ? 'Same account on iPhone and on the web. Apple and Google never see your quotes.' : 'Même compte sur iPhone et sur le web. Apple et Google ne voient jamais vos devis.'}
        </Muted>
      </Card>

      <View style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center' }}>
          {en ? 'By continuing you accept the ' : 'En continuant, vous acceptez les '}
          <Text style={{ color: colors.accent, fontWeight: '600' }} onPress={() => legal('/conditions')}>{en ? 'Terms of use' : 'Conditions d’utilisation'}</Text>
          {en ? ' and the ' : ' et la '}
          <Text style={{ color: colors.accent, fontWeight: '600' }} onPress={() => legal('/confidentialite')}>{en ? 'Privacy policy' : 'Politique de confidentialité'}</Text>
          .
        </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/inscription')} style={{ marginTop: spacing.lg, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 15 }}>{en ? 'Create an account with an email address' : 'Créer un compte avec une adresse e-mail'}</Text>
        </Pressable>
      </View>
    </AuthSurface>
  );
}
