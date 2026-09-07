import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Banner, Body, Button, Card, Field, Muted } from '@/components/ui';
import { AuthSurface } from '@/components/auth-surface';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';
import { copy, useMobileLocale } from '@/lib/i18n';

export default function ConnexionScreen() {
  const locale = useMobileLocale();
  const en = locale === 'en';
  const router = useRouter();
  const { signIn, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const submitting = React.useRef(false);

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)');
    } catch {
      // Le message est porté par le contexte d'authentification.
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <AuthSurface title={en ? 'Welcome back' : 'Content de vous revoir'} subtitle={en ? 'Your workspace, clients and quotes are waiting for you.' : 'Votre atelier, vos clients et vos devis vous attendent.'}>

          <Card style={{ gap: spacing.lg, padding: spacing.xl }}>
            {error ? <Banner tone="danger" title={error} /> : null}
            <Field
              label={copy(locale, 'email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="vous@entreprise.fr"
            />
            <Field
              label={copy(locale, 'password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              placeholder="••••••••••"
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />

            <Button title={copy(locale, 'login')} size="lg" loading={pending} onPress={() => void submit()} haptic />
          </Card>

          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Link href="/(auth)/mot-de-passe" asChild>
              <Pressable accessibilityRole="link">
                <Muted>{en ? 'Forgot your password?' : 'Mot de passe oublié ?'}</Muted>
              </Pressable>
            </Link>
            <Link href="/(auth)/inscription" asChild>
              <Pressable accessibilityRole="link">
                <Body style={{ color: colors.accent, fontWeight: '600' }}>
                  {copy(locale, 'createAccount')}
                </Body>
              </Pressable>
            </Link>
          </View>
    </AuthSurface>
  );
}
