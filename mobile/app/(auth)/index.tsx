import * as React from 'react';
import { Linking, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthScreen, BrandMark, Entrance, Notice, OrDivider, TextAction } from '@/components/auth-kit';
import { AppleContinueButton, EmailContinueButton, GoogleContinueButton } from '@/components/social-buttons';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { useMobileLocale } from '@/lib/i18n';
import { appleSignInAvailable, googleSignInAvailable } from '@/lib/social-auth';
import { appEntry } from '@/lib/first-run';
import { colors, spacing } from '@/theme';

/**
 * Entrée de l'authentification : trois façons de continuer, rien d'autre.
 *
 * Composition centrée sur fond blanc : le monogramme respire dans le tiers
 * haut, le titre porte la promesse, les trois actions occupent le tiers bas.
 * Apple et Google ouvrent les feuilles système et le serveur vérifie leur
 * jeton ; l'adresse e-mail garde le parcours DEVISERA (adresse, mot de
 * passe, code). Une annulation revient ici sans message.
 */
export default function AuthEntryScreen() {
  const locale = useMobileLocale();
  const en = locale === 'en';
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { signInWithApple, signInWithGoogle, error } = useAuth();
  const [apple, setApple] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState<'apple' | 'google' | null>(null);
  const [dismissed, setDismissed] = React.useState<string | null>(null);
  const google = googleSignInAvailable();
  const compact = height < 760;

  React.useEffect(() => {
    let disposed = false;
    void appleSignInAvailable().then((available) => { if (!disposed) setApple(available); });
    return () => { disposed = true; };
  }, []);

  async function run(provider: 'apple' | 'google', action: () => Promise<{ nextStep?: string } | null>) {
    if (busy) return;
    setBusy(provider);
    setDismissed(null);
    try {
      const session = await action();
      if (session) router.replace(appEntry(session as never) as never);
    } catch {
      // Le message est porté par le contexte d'authentification.
    } finally {
      setBusy(null);
    }
  }

  const legal = (path: '/conditions' | '/confidentialite') => void Linking.openURL(`${API_URL}${path}`).catch(() => undefined);
  const visibleError = error && error !== dismissed ? error : null;
  let step = 0;
  const next = () => step++;

  return (
    <AuthScreen
      footer={(
        <Entrance index={7}>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.subtle, textAlign: 'center' }}>
            {en ? 'By continuing you accept the ' : 'En continuant, vous acceptez les '}
            <Text style={{ color: colors.muted, fontWeight: '600' }} onPress={() => legal('/conditions')}>{en ? 'Terms of use' : 'conditions d’utilisation'}</Text>
            {en ? ' and the ' : ' et la '}
            <Text style={{ color: colors.muted, fontWeight: '600' }} onPress={() => legal('/confidentialite')}>{en ? 'Privacy policy' : 'politique de confidentialité'}</Text>
            .
          </Text>
        </Entrance>
      )}
    >
      {/* Tiers haut : la marque et la promesse, centrées. */}
      <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: compact || visibleError ? spacing.lg : spacing['3xl'], paddingBottom: spacing.xl }}>
        <Entrance index={next()} distance={10}>
          <BrandMark size={compact ? 60 : 72} />
        </Entrance>
        <View style={{ height: compact ? spacing['2xl'] : spacing['4xl'] }} />
        <Entrance index={next()}>
          <Text accessibilityRole="header" style={{ fontSize: compact ? 30 : 34, lineHeight: compact ? 35 : 39, fontWeight: '700', letterSpacing: -1.1, color: colors.ink, textAlign: 'center' }}>
            {en ? 'Your quotes.\nSimpler. Faster.' : 'Vos devis.\nPlus simples.\nPlus rapides.'}
          </Text>
        </Entrance>
        <View style={{ height: spacing.md }} />
        <Entrance index={next()}>
          <Text style={{ fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', maxWidth: 320 }}>
            {en ? 'Create, send and follow up your quotes from your iPhone.' : 'Créez, envoyez et suivez vos devis depuis votre iPhone.'}
          </Text>
        </Entrance>
      </View>

      {/* Tiers bas : les trois actions, dans l'ordre Apple, Google, e-mail. */}
      <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
        {visibleError ? (
          <Notice tone="danger" title={visibleError} onDismiss={() => setDismissed(error)} />
        ) : null}
        {apple ? (
          <Entrance index={next()}>
            <AppleContinueButton disabled={busy !== null && busy !== 'apple'} loading={busy === 'apple'} onPress={() => void run('apple', signInWithApple)} />
          </Entrance>
        ) : null}
        {google ? (
          <Entrance index={next()}>
            <GoogleContinueButton disabled={busy !== null && busy !== 'google'} loading={busy === 'google'} onPress={() => void run('google', signInWithGoogle)} />
          </Entrance>
        ) : null}
        {apple || google ? (
          <Entrance index={next()}>
            <OrDivider label={en ? 'or' : 'ou'} />
          </Entrance>
        ) : null}
        <Entrance index={next()}>
          <EmailContinueButton disabled={busy !== null} onPress={() => router.push('/(auth)/inscription')} />
        </Entrance>
        <Entrance index={next()}>
          <TextAction prefix={en ? 'Already have an account?' : 'Déjà un compte ?'} label={en ? 'Sign in' : 'Se connecter'} disabled={busy !== null} onPress={() => router.push('/(auth)/connexion')} />
        </Entrance>
      </View>
    </AuthScreen>
  );
}
