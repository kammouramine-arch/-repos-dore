import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { TRIAL_DAYS, PASSWORD_HINT, passwordErrors } from '@devisia/shared';
import { Banner, Body, Button, Card, Field, Muted } from '@/components/ui';
import { AuthSurface } from '@/components/auth-surface';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';
import { copy, useMobileLocale } from '@/lib/i18n';
import { authDestination, verificationPath } from '@/lib/auth-navigation';

export default function InscriptionScreen() {
  const locale = useMobileLocale();
  const en = locale === 'en';
  const router = useRouter();
  const { signUp, error } = useAuth();
  const [form, setForm] = React.useState({
    companyName: '',
    firstName: '',
    email: '',
    password: '',
  });
  const [pending, setPending] = React.useState(false);
  const submitting = React.useRef(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const update = (key: keyof typeof form) => (value: string) => {
    setValidationError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit() {
    if (submitting.current) return;
    const problems = passwordErrors(form.password);
    setValidationError(problems.length ? problems.join(' ') : null);
    if (problems.length) return;
    submitting.current = true;
    setPending(true);
    try {
      const session = await signUp({
        companyName: form.companyName.trim(),
        firstName: form.firstName.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
      });
      router.replace((session.nextStep === 'verify_email' ? verificationPath('signup') : authDestination(session)) as never);
    } catch {
      // Message affiché sous le champ mot de passe.
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <AuthSurface title={en ? 'Create your workspace' : 'Créez votre atelier'} subtitle={en ? 'Clients, jobs and quotes. Everything starts here.' : 'Vos clients, vos chantiers et vos devis. Tout commence ici.'}>

            <Card style={{ gap: spacing.lg, padding: spacing.xl }}>
              {validationError || error ? <Banner tone="danger" title={validationError ?? error!} /> : null}
              <Field
                label={en ? 'Business name' : 'Nom de votre entreprise'}
                value={form.companyName}
                onChangeText={update('companyName')}
                placeholder="Plomberie Martin"
                autoComplete="organization"
              />
              <Field
                label={en ? 'First name' : 'Votre prénom'}
                hint={en ? 'optional' : 'facultatif'}
                value={form.firstName}
                onChangeText={update('firstName')}
                placeholder="Karim"
                autoComplete="given-name"
              />
              <Field
                label={copy(locale, 'email')}
                value={form.email}
                onChangeText={update('email')}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="vous@entreprise.fr"
              />
              <Field
                label={copy(locale, 'password')}
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
                <Body style={{ color: colors.accent }}>{showPassword ? (en ? 'Hide password' : 'Masquer le mot de passe') : (en ? 'Show password' : 'Afficher le mot de passe')}</Body>
              </Pressable>

              <Button
                title={en ? 'Create my account' : 'Créer mon compte'}
                size="lg"
                loading={pending}
                onPress={() => void submit()}
                haptic
              />
              <Muted style={{ fontSize: 12, textAlign: 'center' }}>
                {Platform.OS === 'ios'
                  ? (en ? `Next, choose your plan and confirm your ${TRIAL_DAYS}-day Apple trial if eligible.` : `Choisissez ensuite votre formule et confirmez votre essai de ${TRIAL_DAYS} jours avec Apple, si vous êtes éligible.`)
                  : (en ? `Try DEVISERA for ${TRIAL_DAYS} days, then choose your plan.` : `Découvrez DEVISERA pendant ${TRIAL_DAYS} jours, puis choisissez votre formule.`)}
              </Muted>
            </Card>

            <View style={{ alignItems: 'center' }}>
              <Link href="/(auth)/connexion" asChild>
                <Pressable accessibilityRole="link">
                  <Body style={{ color: colors.accent, fontWeight: '600' }}>{en ? 'I already have an account' : 'J’ai déjà un compte'}</Body>
                </Pressable>
              </Link>
            </View>
    </AuthSurface>
  );
}
