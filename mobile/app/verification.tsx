import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthSurface } from '@/components/auth-surface';
import { Banner, Body, Button, Card, Field, Heading, Muted } from '@/components/ui';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';
import { copy, mobileLocale } from '@/lib/i18n';

/** The only app surface available until the account proves mailbox ownership. */
export default function VerificationScreen() {
  const router = useRouter();
  const session = useSession();
  const { refresh, signOut } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
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
    <AuthSurface title={copy(locale, 'verify')} subtitle={en ? 'One last step to protect your quotes and keep your account secure.' : 'Une dernière étape pour protéger vos devis et éviter les comptes jetables.'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={{ gap: spacing.lg, padding: spacing.xl }}>
          <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Body style={{ color: colors.accent, fontWeight: '700' }}>@</Body>
          </View>
          <Heading>{copy(locale, 'verifySent')}</Heading>
          <Muted>{en ? `Enter the six-digit code sent to ${session.user.email}. It is valid for 10 minutes. Check your spam folder too.` : `Entrez le code à six chiffres reçu sur ${session.user.email}. Il est valable 10 minutes. Vérifiez aussi vos courriers indésirables.`}</Muted>
          {error ? <Banner tone="danger" title={error} /> : null}
          {notice ? <Banner title={notice} /> : null}
          <Field
            label={en ? 'Confirmation code' : 'Code de confirmation'}
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
            title={copy(locale, 'confirm')}
            loading={busy}
            disabled={code.length !== 6}
            onPress={() => void run(async () => {
              await api.auth.confirmEmailCode(code);
              await refresh();
            })}
            haptic
          />
          <Button
            title={copy(locale, 'resend')}
            variant="secondary"
            disabled={busy}
            onPress={() => void run(async () => {
              const result = await api.auth.requestEmailCode(session.user.email);
              setCode('');
              setNotice(en ? `New code sent to ${result.email}.` : `Nouveau code envoyé à ${result.email}.`);
            })}
          />
          <Button title={en ? 'Change my email' : 'Modifier mon adresse'} variant="ghost" disabled={busy} onPress={() => router.push('/compte')} />
          <Button title={en ? 'Use another account' : 'Utiliser un autre compte'} variant="ghost" disabled={busy} onPress={() => void run(signOut)} />
        </Card>
      </KeyboardAvoidingView>
    </AuthSurface>
  );
}
