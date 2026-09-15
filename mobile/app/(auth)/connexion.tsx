import * as React from 'react';
import { View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthField, AuthHeading, AuthScreen, Entrance, Notice, PrimaryAction, TextAction } from '@/components/auth-kit';
import { useAuth } from '@/lib/auth';
import { spacing } from '@/theme';
import { copy, useMobileLocale } from '@/lib/i18n';
import { authDestination, verificationPath } from '@/lib/auth-navigation';

/** Connexion par adresse e-mail et mot de passe : la logique est inchangée. */
export default function ConnexionScreen() {
  const locale = useMobileLocale();
  const en = locale === 'en';
  const router = useRouter();
  const { signIn, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);
  const submitting = React.useRef(false);
  const passwordRef = React.useRef<TextInput>(null);

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setAttempted(true);
    setPending(true);
    try {
      const session = await signIn(email.trim(), password);
      router.replace((session.nextStep === 'verify_email' ? verificationPath('signin') : authDestination(session)) as never);
    } catch {
      // Le message est porté par le contexte d'authentification.
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const ready = email.trim().length > 3 && password.length > 0;

  return (
    <AuthScreen
      back
      footer={(
        <Entrance index={6}>
          <TextAction prefix={en ? 'New to DEVISERA?' : 'Nouveau sur DEVISERA ?'} label={copy(locale, 'createAccount')} disabled={pending} onPress={() => router.replace('/(auth)/inscription')} />
        </Entrance>
      )}
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing['2xl'] }}>
        <AuthHeading
          title={en ? 'Welcome back' : 'Content de vous revoir'}
          subtitle={en ? 'Your workspace, clients and quotes are waiting for you.' : 'Votre atelier, vos clients et vos devis vous attendent.'}
        />
        <View style={{ gap: spacing.lg }}>
          {attempted && error ? <Notice tone="danger" title={error} /> : null}
          <Entrance index={2}>
            <AuthField
              label={copy(locale, 'email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="vous@entreprise.fr"
              returnKeyType="next"
              editable={!pending}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </Entrance>
          <Entrance index={3}>
            <AuthField
              inputRef={passwordRef}
              label={copy(locale, 'password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              placeholder="••••••••••"
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
              editable={!pending}
            />
          </Entrance>
          <Entrance index={4}>
            <TextAction align="left" label={en ? 'Forgot your password?' : 'Mot de passe oublié ?'} disabled={pending} onPress={() => router.push('/(auth)/mot-de-passe')} />
          </Entrance>
          <Entrance index={5}>
            <PrimaryAction title={copy(locale, 'login')} loading={pending} disabled={!ready} onPress={() => void submit()} />
          </Entrance>
        </View>
      </View>
    </AuthScreen>
  );
}
