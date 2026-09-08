import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Banner, Button, Card, Field, Heading, Muted, Screen } from '@/components/ui';
import { SettingsGroup, SettingsRow, StatusChip } from '@/components/settings';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { DiagnosticReport } from '@/components/diagnostic-report';
import { copy, mobileLocale } from '@/lib/i18n';
import { colors, spacing } from '@/theme';

/**
 * « Mon compte » : les informations du compte, rien d'autre.
 *
 * L'écran portait aussi paiements, avis, contact, mentions légales et
 * suppression — un artisan cherchait « Noter l'application » sous un champ
 * de code de confirmation. Ces zones vivent maintenant dans « Mon espace » ;
 * ici restent l'identité, l'adresse de connexion, la langue et les actions
 * de sécurité. Les appels d'API sont inchangés.
 */
export default function CompteScreen() {
  const session = useSession();
  const router = useRouter();
  const { refresh, signOut, adoptSession } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const [firstName, setFirstName] = React.useState(session.user.firstName ?? '');
  const [lastName, setLastName] = React.useState(session.user.lastName ?? '');
  const [email, setEmail] = React.useState(session.user.email);
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [destination, setDestination] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const acting = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const changingEmail = email.trim().toLowerCase() !== session.user.email;
  const verified = session.user.emailVerified;

  async function perform(fn: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true; setBusy(true); setError(null); setNotice(null);
    try { await fn(); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : (en ? 'Try again in a moment. Your entries are kept.' : 'Réessayez dans un instant. Vos saisies sont conservées.')); }
    finally { acting.current = false; if (mounted.current) setBusy(false); }
  }

  async function exportJson(name: string, load: () => Promise<Record<string, unknown>>) {
    if (!(await Sharing.isAvailableAsync())) throw new Error(en ? 'File sharing is not available on this device.' : 'Le partage de fichiers n’est pas disponible sur cet appareil.');
    const data = await load();
    const file = new File(Paths.cache, `${name}-${Date.now()}.json`);
    try {
      file.write(JSON.stringify(data, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
    } finally { if (file.exists) file.delete(); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <Screen>
        <View style={{ gap: spacing.sm }}>
          <Heading style={{ fontSize: 22, lineHeight: 28 }}>{en ? 'Your details' : 'Vos informations'}</Heading>
          <Muted>{en ? 'Update your details without changing your plan. Your quotes and subscription stay on this account.' : 'Corrigez vos coordonnées sans toucher à votre formule. Vos devis et votre abonnement restent sur ce compte.'}</Muted>
        </View>

        {error ? <Banner tone="danger" title={error} onDismiss={() => setError(null)} /> : null}
        {notice ? <Banner tone="success" title={notice} onDismiss={() => setNotice(null)} /> : null}

        <Card style={{ gap: spacing.lg }}>
          <Heading>{en ? 'Identity' : 'Identité'}</Heading>
          <Field label={en ? 'First name' : 'Prénom'} value={firstName} onChangeText={setFirstName} autoComplete="given-name" maxLength={80} editable={!busy} />
          <Field label={en ? 'Last name' : 'Nom'} value={lastName} onChangeText={setLastName} autoComplete="family-name" maxLength={80} editable={!busy} />
          <Button title={en ? 'Save my name' : 'Enregistrer mon nom'} disabled={busy} onPress={() => void perform(async () => { await api.auth.updateName(firstName, lastName); await refresh(); setNotice(en ? 'Your name was saved.' : 'Votre nom a été enregistré.'); })} />
        </Card>

        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Heading>{en ? 'Sign-in address' : 'Adresse de connexion'}</Heading>
            <StatusChip tone={verified ? 'success' : 'warning'} label={copy(locale, verified ? 'verifiedEmail' : 'unverifiedEmail')} />
          </View>
          {!verified ? <Muted>{en ? 'Confirm your address to protect your account and unlock your workspace.' : 'Confirmez votre adresse pour protéger votre compte et ouvrir votre atelier.'}</Muted> : null}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!busy} />
          {changingEmail ? (
            <>
              <Field label={en ? 'Current password' : 'Mot de passe actuel'} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy} />
              <Muted>{en ? 'Your current address remains usable until the new one is confirmed. Other devices will sign out after the change.' : 'Votre adresse actuelle reste utilisable jusqu’à la confirmation de la nouvelle. Les autres appareils seront déconnectés après ce changement.'}</Muted>
            </>
          ) : null}
          {!verified || changingEmail || destination ? (
            <>
              <Button
                title={destination ? copy(locale, 'resend') : (en ? 'Get a confirmation code' : 'Recevoir un code de confirmation')}
                variant="secondary"
                disabled={busy || !email.trim() || (changingEmail && !password)}
                onPress={() => void perform(async () => {
                  const result = await api.auth.requestEmailCode(email, changingEmail ? password : undefined);
                  setDestination(result.email); setPassword(''); setCode('');
                  setNotice(en ? `Code sent to ${result.email}. Check your spam folder too.` : `Code envoyé à ${result.email}. Vérifiez aussi vos courriers indésirables.`);
                })}
              />
              <Muted>{en ? 'Code valid for 10 minutes. Wait at least one minute between requests.' : 'Code valable 10 minutes. Patientez au moins une minute entre deux demandes.'}</Muted>
              <Field label={en ? 'Email code' : 'Code reçu par email'} value={code} onChangeText={(value) => setCode(value.normalize('NFKC').replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!busy} />
              <Button title={en ? 'Confirm my email' : 'Confirmer mon email'} disabled={busy || code.length !== 6} onPress={() => void perform(async () => {
                const result = await api.auth.confirmEmailCode(code);
                adoptSession(result.session);
                if (destination) setEmail(destination);
                setDestination(null); setCode(''); setNotice(en ? 'Your email address is confirmed.' : 'Votre adresse email est confirmée.');
              })} />
            </>
          ) : (
            <Muted>{en ? 'Change the address above to receive a confirmation code.' : 'Modifiez l’adresse ci-dessus pour recevoir un code de confirmation.'}</Muted>
          )}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Heading>{copy(locale, 'language')}</Heading>
          <Muted>{en ? 'Saved to your account; guides generated answers and documents.' : 'Conservée sur votre compte ; guide les réponses et documents générés.'}</Muted>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} title={copy(locale, 'french')} variant={session.user.locale === 'fr' ? 'primary' : 'secondary'} disabled={busy || session.user.locale === 'fr'} onPress={() => void perform(async () => { await api.auth.updateLanguage('fr'); await refresh(); setNotice('Langue française enregistrée.'); })} />
            <Button style={{ flex: 1 }} title={copy(locale, 'english')} variant={session.user.locale === 'en' ? 'primary' : 'secondary'} disabled={busy || session.user.locale === 'en'} onPress={() => void perform(async () => { await api.auth.updateLanguage('en'); await refresh(); setNotice('English language saved.'); })} />
          </View>
        </Card>

        <SettingsGroup
          title={copy(locale, 'security')}
          footer={en ? 'Exports contain your identity and business records, never secrets or tokens. Diagnostics hold timings and error categories only.' : 'Les exports contiennent votre identité et vos données commerciales, jamais de secret ni de jeton. Le diagnostic ne contient que des durées et des catégories d’erreur.'}
        >
          <SettingsRow icon="download-outline" title={copy(locale, 'exportPersonal')} onPress={() => void perform(() => exportJson('DEVISERA-compte', () => api.auth.exportPersonal()))} />
          <SettingsRow icon="briefcase-outline" title={copy(locale, 'exportBusiness')} onPress={() => void perform(() => exportJson('DEVISERA-donnees', () => api.auth.exportBusiness()))} />
          <DiagnosticReport en={en} />
          <SettingsRow icon="log-out-outline" title={copy(locale, 'signOut')} onPress={() => void perform(signOut)} />
        </SettingsGroup>

        <SettingsGroup title={copy(locale, 'dangerZone')}>
          <SettingsRow icon="trash-outline" title={copy(locale, 'deleteAccount')} destructive onPress={() => router.push('/suppression')} />
        </SettingsGroup>
        <View style={{ height: spacing.md, backgroundColor: colors.surface }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
