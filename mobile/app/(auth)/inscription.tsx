import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TRIAL_DAYS, PASSWORD_HINT, passwordErrors } from '@devisia/shared';
import { Banner, Body, Button, Card, Field, Muted, Title } from '@/components/ui';
import { Reveal } from '@/components/motion';
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
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const update = (key: keyof typeof form) => (value: string) => {
    setValidationError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit() {
    if (pending) return;
    const problems = passwordErrors(form.password);
    setValidationError(problems.length ? problems.join(' ') : null);
    if (problems.length) return;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 300,
          backgroundColor: colors.accentDeep,
          borderBottomLeftRadius: 42,
          borderBottomRightRadius: 42,
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['5xl'] }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <Reveal style={{ gap: spacing.xl }}>
            <View style={{ gap: spacing.sm, paddingHorizontal: spacing.sm }}>
              <Logo tone="white" />
              <Title style={{ marginTop: spacing.lg, color: colors.white }}>Créez votre atelier</Title>
              <Muted style={{ color: 'rgba(255,255,255,0.72)' }}>
                Configurez DEVISIA en moins de deux minutes.
              </Muted>
            </View>

            <Card style={{ gap: spacing.lg, padding: spacing.xl }}>
              {validationError || error ? <Banner tone="danger" title={validationError ?? error!} /> : null}
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
                hint={PASSWORD_HINT}
                value={form.password}
                onChangeText={update('password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                placeholder="••••••••••"
              />
              <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setShowPassword((current) => !current)}>
                <Body style={{ color: colors.accent }}>{showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}</Body>
              </Pressable>

              <Button
                title="Créer mon compte"
                size="lg"
                loading={pending}
                onPress={() => void submit()}
                haptic
              />
              <Muted style={{ fontSize: 12, textAlign: 'center' }}>
                {TRIAL_DAYS} jours pour découvrir DEVISIA. Vous choisirez votre formule avant toute facturation.
              </Muted>
            </Card>

            <View style={{ alignItems: 'center' }}>
              <Link href="/(auth)/connexion" asChild>
                <Pressable accessibilityRole="link">
                  <Body style={{ color: colors.accent, fontWeight: '600' }}>J’ai déjà un compte</Body>
                </Pressable>
              </Link>
            </View>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
