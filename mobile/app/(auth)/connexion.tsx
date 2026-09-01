import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Body, Button, Field, Muted, Title } from '@/components/ui';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function ConnexionScreen() {
  const router = useRouter();
  const { signIn, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)');
    } catch {
      // Le message est porté par le contexte d'authentification.
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.xl, gap: spacing.xl, justifyContent: 'center' }}
      >
        <View style={{ gap: spacing.sm }}>
          <Logo />
          <Title style={{ marginTop: spacing.lg }}>Content de vous revoir</Title>
          <Muted>Retrouvez vos devis, vos clients et vos relances.</Muted>
        </View>

        <View style={{ gap: spacing.lg }}>
          {/* Le message porte sur la tentative, pas sur un champ en
              particulier : l'accrocher au mot de passe désignait un coupable
              qui n'en était pas toujours un. */}
          {error ? <Banner tone="danger" title={error} /> : null}
          <Field
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="vous@entreprise.fr"
          />
          <Field
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••••••"
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />

          <Button title="Se connecter" size="lg" loading={pending} onPress={() => void submit()} haptic />
        </View>

        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Link href="/(auth)/mot-de-passe" asChild>
            <Pressable accessibilityRole="link">
              <Muted>Mot de passe oublié ?</Muted>
            </Pressable>
          </Link>
          <Link href="/(auth)/inscription" asChild>
            <Pressable accessibilityRole="link">
              <Body style={{ color: colors.accent, fontWeight: '600' }}>
                Créer un compte gratuitement
              </Body>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
