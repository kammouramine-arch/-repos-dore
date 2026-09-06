import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthSurface } from '@/components/auth-surface';
import { Banner, Body, Button, Card, Field, Heading, Muted } from '@/components/ui';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

/** The only app surface available until the account proves mailbox ownership. */
export default function VerificationScreen() {
  const router = useRouter();
  const session = useSession();
  const { refresh, signOut } = useAuth();
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const acting = React.useRef(false);

  async function run(action: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Réessayez dans un instant.'); }
    finally { acting.current = false; setBusy(false); }
  }

  return (
    <AuthSurface title="Vérifiez votre adresse" subtitle="Une dernière étape pour protéger vos devis et éviter les comptes jetables.">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={{ gap: spacing.lg, padding: spacing.xl }}>
          <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Body style={{ color: colors.accent, fontWeight: '700' }}>@</Body>
          </View>
          <Heading>Un code vient d’être envoyé</Heading>
          <Muted>Entrez le code à six chiffres reçu sur {session.user.email}. Il est valable 10 minutes. Vérifiez aussi vos courriers indésirables.</Muted>
          {error ? <Banner tone="danger" title={error} /> : null}
          {notice ? <Banner title={notice} /> : null}
          <Field
            label="Code de confirmation"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!busy}
            autoFocus
          />
          <Button
            title="Confirmer mon adresse"
            loading={busy}
            disabled={code.length !== 6}
            onPress={() => void run(async () => {
              await api.auth.confirmEmailCode(code);
              await refresh();
            })}
            haptic
          />
          <Button
            title="Renvoyer un code"
            variant="secondary"
            disabled={busy}
            onPress={() => void run(async () => {
              const result = await api.auth.requestEmailCode(session.user.email);
              setCode('');
              setNotice(`Nouveau code envoyé à ${result.email}.`);
            })}
          />
          <Button title="Modifier mon adresse" variant="ghost" disabled={busy} onPress={() => router.push('/compte')} />
          <Button title="Utiliser un autre compte" variant="ghost" disabled={busy} onPress={() => void run(signOut)} />
        </Card>
      </KeyboardAvoidingView>
    </AuthSurface>
  );
}
