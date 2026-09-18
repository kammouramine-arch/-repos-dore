import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthField, AuthHeading, AuthScreen, Entrance, Notice, PrimaryAction, TextAction } from '@/components/auth-kit';
import { api } from '@/lib/api';
import { useMobileLocale } from '@/lib/i18n';
import { spacing, useThemeScheme } from '@/theme';

/** Demande de lien de réinitialisation : la logique est inchangée. */
export default function MotDePasseScreen() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const router = useRouter();
  const en = useMobileLocale() === 'en';
  const [email, setEmail] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const submitting = React.useRef(false);

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setFailed(false);
    setPending(true);
    try {
      await api.auth.requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      // Never disclose account existence or mistake a transport failure for delivery.
      setFailed(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <AuthScreen
      back
      footer={(
        <Entrance index={4}>
          <TextAction label={en ? 'Back to sign in' : 'Retour à la connexion'} disabled={pending} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/connexion'))} />
        </Entrance>
      )}
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing['2xl'] }}>
        <AuthHeading
          title={en ? 'Forgot your password?' : 'Mot de passe oublié ?'}
          subtitle={en ? 'Enter your address and we will send you a reset link.' : 'Indiquez votre adresse : nous vous envoyons un lien pour en choisir un nouveau.'}
        />
        <View style={{ gap: spacing.lg }}>
          {failed ? <Notice tone="danger" title={en ? 'The request did not go through' : 'La demande n’a pas abouti'} description={en ? 'Please try again in a moment. Nothing has changed.' : 'Réessayez dans un instant. Aucun changement n’a été effectué.'} /> : null}
          {sent ? (
            <Notice
              tone="success"
              title={en ? 'Check your inbox' : 'Vérifiez votre boîte mail'}
              description={en ? 'If an account exists with this address, you will receive a reset link. Check your spam folder too.' : 'Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation. Pensez aussi aux courriers indésirables.'}
            />
          ) : (
            <>
              <Entrance index={2}>
                <AuthField
                  label={en ? 'Email address' : 'Adresse e-mail'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="vous@entreprise.fr"
                  returnKeyType="send"
                  onSubmitEditing={() => void submit()}
                  editable={!pending}
                  autoFocus
                />
              </Entrance>
              <Entrance index={3}>
                <PrimaryAction title={en ? 'Send the link' : 'Recevoir le lien'} loading={pending} disabled={email.trim().length < 4} onPress={() => void submit()} />
              </Entrance>
            </>
          )}
        </View>
      </View>
    </AuthScreen>
  );
}
