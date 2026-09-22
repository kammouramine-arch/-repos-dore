import { MetaConsent } from '@/components/meta-consent';
import * as React from 'react';
import { Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TRIAL_DAYS, PASSWORD_HINT, passwordErrors } from '@devisia/shared';
import { AuthField, AuthHeading, AuthScreen, Entrance, Notice, PrimaryAction, StepProgress, TextAction } from '@/components/auth-kit';
import { useAuth } from '@/lib/auth';
import { colors, spacing, useThemeScheme } from '@/theme';
import { copy, useMobileLocale } from '@/lib/i18n';
import { verificationPath } from '@/lib/auth-navigation';
import { appEntry, markWorkshopReady } from '@/lib/first-run';

/** Création de compte par adresse e-mail : la logique (mot de passe, code) est inchangée. */
export default function InscriptionScreen() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
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
  const [attempted, setAttempted] = React.useState(false);
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
    setAttempted(true);
    setPending(true);
    try {
      const session = await signUp({
        companyName: form.companyName.trim(),
        firstName: form.firstName.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
      });
      // Inscription par e-mail : le nom de l'entreprise est saisi ici même,
      // il n'y a pas d'étape « bienvenue ». L'écran de fin de configuration
      // est donc dû à partir d'ici, une fois l'adresse confirmée.
      markWorkshopReady(session.user.id);
      router.replace((session.nextStep === 'verify_email' ? verificationPath('signup') : appEntry(session)) as never);
    } catch {
      // Message affiché au-dessus du formulaire.
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const ready = form.companyName.trim().length >= 2 && form.email.trim().length > 3 && form.password.length > 0;

  return (
    <AuthScreen
      back
      footer={(
        <Entrance index={8}>
          <TextAction prefix={en ? 'Already have an account?' : 'Déjà un compte ?'} label={en ? 'Sign in' : 'Se connecter'} disabled={pending} onPress={() => router.replace('/(auth)/connexion')} />
        </Entrance>
      )}
    >
      <View style={{ paddingTop: spacing.sm, gap: spacing['2xl'], paddingBottom: spacing.lg }}>
        <Entrance index={0}>
          <StepProgress step={1} total={2} label={en ? 'Step 1 of 2 · Your account' : 'Étape 1 sur 2 · Votre compte'} />
        </Entrance>
        <AuthHeading
          index={1}
          title={en ? 'Create your workspace' : 'Créez votre atelier'}
          subtitle={en ? 'Clients, jobs and quotes. Everything starts here.' : 'Vos clients, vos chantiers et vos devis. Tout commence ici.'}
        />
        <View style={{ gap: spacing.lg }}>
          {validationError || (attempted && error) ? <Notice tone="danger" title={validationError ?? error!} /> : null}
          <Entrance index={3}>
            <AuthField
              label={en ? 'Business name' : 'Nom de votre entreprise'}
              value={form.companyName}
              onChangeText={update('companyName')}
              placeholder="Plomberie Martin"
              autoComplete="organization"
              editable={!pending}
            />
          </Entrance>
          <Entrance index={4}>
            <AuthField
              label={en ? 'First name' : 'Votre prénom'}
              hint={en ? 'optional' : 'facultatif'}
              value={form.firstName}
              onChangeText={update('firstName')}
              placeholder="Karim"
              autoComplete="given-name"
              editable={!pending}
            />
          </Entrance>
          <Entrance index={5}>
            <AuthField
              label={copy(locale, 'email')}
              value={form.email}
              onChangeText={update('email')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="vous@entreprise.fr"
              editable={!pending}
            />
          </Entrance>
          <Entrance index={6}>
            <AuthField
              label={copy(locale, 'password')}
              help={PASSWORD_HINT}
              value={form.password}
              onChangeText={update('password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="••••••••••"
              editable={!pending}
            />
            <TextAction align="left" label={showPassword ? (en ? 'Hide password' : 'Masquer le mot de passe') : (en ? 'Show password' : 'Afficher le mot de passe')} onPress={() => setShowPassword((current) => !current)} />
          </Entrance>
          <Entrance index={7}>
            <MetaConsent />
            <PrimaryAction title={en ? 'Create my account' : 'Créer mon compte'} loading={pending} disabled={!ready} onPress={() => void submit()} />
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.subtle, textAlign: 'center', marginTop: spacing.md }}>
              {Platform.OS === 'ios'
                ? (en ? `Next, choose your plan and confirm your ${TRIAL_DAYS}-day Apple trial if eligible.` : `Choisissez ensuite votre formule et confirmez votre essai de ${TRIAL_DAYS} jours avec Apple, si vous êtes éligible.`)
                : (en ? `Try DEVISERA for ${TRIAL_DAYS} days, then choose your plan.` : `Découvrez DEVISERA pendant ${TRIAL_DAYS} jours, puis choisissez votre formule.`)}
            </Text>
          </Entrance>
        </View>
      </View>
    </AuthScreen>
  );
}
