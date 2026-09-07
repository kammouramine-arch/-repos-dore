import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthSurface } from '@/components/auth-surface';
import { Banner, Body, Button, Card, Field, Heading, Muted } from '@/components/ui';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { DevisiaApiError } from '@devisia/shared';
import { colors, spacing } from '@/theme';
import { copy, mobileLocale } from '@/lib/i18n';
import { authDestination, verificationSourcePath } from '@/lib/auth-navigation';
import { recordDiagnostic } from '@/lib/diagnostics';

/** The only app surface available until the account proves mailbox ownership. */
export default function VerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const session = useSession();
  const { adoptSession, errorReference, refresh, signOut } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [localErrorReference, setLocalErrorReference] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(0);
  const acting = React.useRef(false);
  const mounted = React.useRef(true);
  const source = params.source === 'signup' ? 'signup' : 'signin';
  const resendCoolingDown = resendIn > 0;

  React.useEffect(() => () => { mounted.current = false; }, []);

  async function run(action: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true;
    if (mounted.current) { setBusy(true); setError(null); setLocalErrorReference(null); setNotice(null); }
    try { await action(); }
    catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Réessayez dans un instant.');
        setLocalErrorReference(cause instanceof DevisiaApiError ? cause.requestId ?? null : null);
      }
    }
    finally { acting.current = false; if (mounted.current) setBusy(false); }
  }

  React.useEffect(() => {
    if (!resendCoolingDown) return;
    const timer = setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCoolingDown]);

  async function changeEmail() {
    recordDiagnostic({ area: 'navigation', durationMs: 0, code: 'VERIFY_CHANGE_EMAIL', category: 'ok', path: '/verification', status: 0 });
    await signOut();
    router.replace(verificationSourcePath(source) as never);
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
          {error ? <Banner tone="danger" title={error} description={(localErrorReference ?? errorReference) ? `${copy(locale, 'reference')} : ${localErrorReference ?? errorReference}` : undefined} /> : null}
          {notice ? <Banner title={notice} /> : null}
          <Field
            label={en ? 'Confirmation code' : 'Code de confirmation'}
            value={code}
            onChangeText={(value) => setCode(value.normalize('NFKC').replace(/\D/g, '').slice(0, 6))}
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
              const result = await api.auth.confirmEmailCode(code);
              // The endpoint returns a fresh server DTO. Adopt it immediately
              // so the verification screen cannot remain mounted on stale
              // state while a second refresh request is in flight.
              const freshSession = result.session ?? await refresh();
              if (!freshSession) throw new Error(en ? 'Your session expired. Please sign in again.' : 'Votre session a expiré. Reconnectez-vous.');
              adoptSession(freshSession);
              router.replace(authDestination(freshSession) as never);
            })}
            haptic
          />
          <Button
            title={copy(locale, 'resend')}
            variant="secondary"
            disabled={busy || resendCoolingDown}
            onPress={() => void run(async () => {
              const result = await api.auth.requestEmailCode(session.user.email);
              if (mounted.current) {
                setCode('');
                setResendIn(60);
                setNotice(en ? `New code sent to ${result.email}.` : `Nouveau code envoyé à ${result.email}.`);
              }
            })}
          />
          {resendIn > 0 ? <Muted>{en ? `You can request another code in ${resendIn}s.` : `Vous pourrez demander un nouveau code dans ${resendIn}s.`}</Muted> : null}
          <Button title={en ? 'Change my email' : 'Modifier mon adresse'} variant="ghost" disabled={busy} onPress={() => void run(changeEmail)} />
          <Button title={en ? 'Use another account' : 'Utiliser un autre compte'} variant="ghost" disabled={busy} onPress={() => void run(signOut)} />
        </Card>
      </KeyboardAvoidingView>
    </AuthSurface>
  );
}
