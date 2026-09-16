import * as React from 'react';
import { AppState, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthHeading, AuthScreen, CodeInput, Entrance, Notice, PrimaryAction, TextAction } from '@/components/auth-kit';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { DevisiaApiError } from '@devisia/shared';
import { colors, spacing } from '@/theme';
import { copy, useMobileLocale } from '@/lib/i18n';
import { verificationSourcePath } from '@/lib/auth-navigation';
import { appEntry } from '@/lib/first-run';
import { recordDiagnostic } from '@/lib/diagnostics';

/** The only app surface available until the account proves mailbox ownership. */
export default function VerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const session = useSession();
  const { adoptSession, refresh, signOut } = useAuth();
  const locale = useMobileLocale();
  const en = locale === 'en';
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const deadline = React.useRef(0);
  const cooldownRevision = React.useRef(0);
  const [resendIn, setResendIn] = React.useState(0);
  const acting = React.useRef(false);
  const mounted = React.useRef(true);
  const source = params.source === 'signup' ? 'signup' : 'signin';
  const resendCoolingDown = resendIn > 0;

  function applyCooldown(seconds: number) {
    cooldownRevision.current += 1;
    deadline.current = Date.now() + Math.max(0, seconds) * 1000;
    setResendIn(Math.max(0, Math.ceil(seconds)));
  }
  React.useEffect(() => {
    mounted.current = true;
    const tick = () => { if (mounted.current) setResendIn(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))); };
    const status = async () => {
      const revision = cooldownRevision.current;
      try {
        const result = await api.request<{ retryAfterSeconds: number }>('/api/auth/code-email');
        if (mounted.current && revision === cooldownRevision.current) applyCooldown(result.retryAfterSeconds);
      } catch { /* Server still enforces every resend; do not replace the form with a status-query error. */ }
    };
    void status();
    const timer = setInterval(tick, 1000);
    const resume = AppState.addEventListener('change', state => { if (state === 'active') { tick(); void status(); } });
    return () => { mounted.current = false; clearInterval(timer); resume.remove(); };
  }, [session.user.id]);

  async function run(action: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true;
    if (mounted.current) { setBusy(true); setError(null); setNotice(null); }
    try { await action(); }
    catch (cause) {
      if (mounted.current) {
        if (cause instanceof DevisiaApiError && cause.retryAfterSeconds) {
          applyCooldown(cause.retryAfterSeconds);
        } else setError(cause instanceof Error ? cause.message : (en ? 'Please try again shortly.' : 'Réessayez dans un instant.'));
      }
    }
    finally { acting.current = false; if (mounted.current) setBusy(false); }
  }

  async function changeEmail() {
    recordDiagnostic({ area: 'navigation', durationMs: 0, code: 'VERIFY_CHANGE_EMAIL', category: 'ok', path: '/verification', status: 0 });
    await signOut();
    router.replace(verificationSourcePath(source) as never);
  }

  const confirm = () => void run(async () => {
    const result = await api.auth.confirmEmailCode(code);
    // The endpoint returns a fresh server DTO. Adopt it immediately
    // so the verification screen cannot remain mounted on stale
    // state while a second refresh request is in flight.
    const freshSession = result.session ?? await refresh();
    if (!freshSession) throw new Error(en ? 'Your session expired. Please sign in again.' : 'Votre session a expiré. Reconnectez-vous.');
    adoptSession(freshSession);
    router.replace(appEntry(freshSession) as never);
  });

  // Six chiffres saisis : la confirmation part d'elle-même.
  const submitted = React.useRef('');
  React.useEffect(() => {
    if (code.length === 6 && !busy && submitted.current !== code) {
      submitted.current = code;
      confirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AuthScreen
      footer={(
        <Entrance index={6}>
          <View style={{ gap: spacing.xs }}>
            <TextAction label={en ? 'Change my email' : 'Modifier mon adresse'} disabled={busy} onPress={() => void run(changeEmail)} />
            <TextAction label={en ? 'Use another account' : 'Utiliser un autre compte'} disabled={busy} onPress={() => void run(signOut)} />
          </View>
        </Entrance>
      )}
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing['2xl'] }}>
        <AuthHeading
          kicker={source === 'signup' ? (en ? 'Step 2 of 2' : 'Étape 2 sur 2') : undefined}
          title={copy(locale, 'verify')}
          subtitle={en ? `Enter the six-digit code sent to ${session.user.email}.` : `Entrez le code à six chiffres envoyé à ${session.user.email}.`}
        />
        <View style={{ gap: spacing.lg }}>
          {error ? <Notice tone="danger" title={error} /> : null}
          {notice ? <Notice tone="success" title={notice} /> : null}
          <Entrance index={3}>
            <CodeInput value={code} onChange={(value) => { setError(null); setCode(value); }} editable={!busy} error={Boolean(error)} autoFocus />
          </Entrance>
          <Entrance index={4}>
            <Text style={{ fontSize: 13, lineHeight: 19, color: colors.subtle, textAlign: 'center' }}>
              {en ? 'Valid for 10 minutes. Check your spam folder too.' : 'Valable 10 minutes. Vérifiez aussi vos courriers indésirables.'}
            </Text>
          </Entrance>
          <Entrance index={5}>
            <PrimaryAction title={copy(locale, 'confirm')} loading={busy} disabled={code.length !== 6} onPress={confirm} />
            <View style={{ marginTop: spacing.md }}>
              <TextAction
                prefix={resendIn > 0 ? (en ? `New code in ${resendIn} s.` : `Nouveau code dans ${resendIn} s.`) : (en ? 'Nothing received?' : 'Rien reçu ?')}
                label={copy(locale, 'resend')}
                disabled={busy || resendCoolingDown}
                onPress={() => void run(async () => {
                  const result = await api.auth.requestEmailCode(session.user.email);
                  if (mounted.current) {
                    setCode('');
                    submitted.current = '';
                    applyCooldown(result.retryAfterSeconds);
                    setNotice(en ? `New code sent to ${result.email}.` : `Nouveau code envoyé à ${result.email}.`);
                  }
                })}
              />
            </View>
          </Entrance>
        </View>
      </View>
    </AuthScreen>
  );
}
