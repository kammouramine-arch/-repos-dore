import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TRIAL_DAYS } from '@devisia/shared';
import { Body, Button, Field, Muted, Title } from '@/components/ui';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function InscriptionScreen() {
  const router = useRouter();
  const { signUp, error } = useAuth();
  const [form, setForm] = React.useState({
    companyName: '',
    firstName: '',
    email: '',
    password: '',
  });
  const [pending, setPending] = React.useState(false);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setPending(true);
    try {
      await signUp({
        companyName: form.companyName.trim(),
        firstName: form.firstName.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
      });
      router.replace('/(app)');
    } catch {
      // Message affiché sous le champ mot de passe.
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.sm }}>
            <Logo />
            <Title style={{ marginTop: spacing.lg }}>Créez votre compte</Title>
            <Muted>
              {TRIAL_DAYS} jours d’essai gratuit. Aucune carte bancaire requise.
            </Muted>
          </View>

          <View style={{ gap: spacing.lg }}>
            <Field
              label="Nom de votre entreprise"
              value={form.companyName}
              onChangeText={update('companyName')}
              placeholder="Plomberie Martin"
              autoComplete="organization"
            />
            <Field
              label="Votre prénom"
              hint="facultatif"
              value={form.firstName}
              onChangeText={update('firstName')}
              placeholder="Karim"
              autoComplete="given-name"
            />
            <Field
              label="Adresse email"
              value={form.email}
              onChangeText={update('email')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="vous@entreprise.fr"
            />
            <Field
              label="Mot de passe"
              hint="10 caractères minimum"
              value={form.password}
              onChangeText={update('password')}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••••"
              error={error}
            />

            <Button
              title="Créer mon compte"
              size="lg"
              loading={pending}
              onPress={() => void submit()}
              haptic
            />
          </View>

          <View style={{ alignItems: 'center' }}>
            <Link href="/(auth)/connexion" asChild>
              <Pressable accessibilityRole="link">
                <Body style={{ color: colors.accent, fontWeight: '600' }}>J’ai déjà un compte</Body>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
