import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Field } from '@/components/ui';
import { AuthSurface } from '@/components/auth-surface';
import { api } from '@/lib/api';
import { spacing } from '@/theme';

export default function MotDePasseScreen() {
  const router = useRouter();
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
    <AuthSurface title="Mot de passe oublié" subtitle="Indiquez votre adresse pour demander un lien de réinitialisation.">
        {failed ? <Banner tone="danger" title="La demande n’a pas abouti" description="Veuillez réessayer dans un instant. Aucun changement n’a été effectué." /> : null}

        {sent ? (
          <Banner
            tone="success"
            title="Vérifiez votre boîte mail"
            description="Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation. Pensez aussi aux courriers indésirables."
          />
        ) : (
          <Field
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="vous@entreprise.fr"
          />
        )}

        <View style={{ gap: spacing.md }}>
          {!sent ? (
            <Button title="Recevoir le lien" size="lg" loading={pending} onPress={() => void submit()} />
          ) : null}
          <Button title="Retour à la connexion" variant="ghost" onPress={() => router.back()} />
        </View>
    </AuthSurface>
  );
}
