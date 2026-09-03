import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Field, Muted, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

export default function MotDePasseScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function submit() {
    setPending(true);
    try {
      await api.auth.requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      // La réponse est volontairement identique : aucun compte n'est révélé.
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl, justifyContent: 'center' }}>
        <View style={{ gap: spacing.sm }}>
          <Title>Mot de passe oublié</Title>
          <Muted>Indiquez votre adresse : vous recevrez un lien pour en choisir un nouveau.</Muted>
        </View>

        {sent ? (
          <Banner
            tone="success"
            title="Vérifiez votre boîte mail"
            description="Si un compte existe avec cette adresse, un lien vient d’être envoyé."
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
      </View>
    </SafeAreaView>
  );
}
