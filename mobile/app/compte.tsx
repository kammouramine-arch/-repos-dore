import * as React from 'react';
import { KeyboardAvoidingView, Linking, Platform, Share } from 'react-native';
import { Banner, Button, Card, Field, Heading, Muted, Screen } from '@/components/ui';
import { useAuth, useSession } from '@/lib/auth';
import { api, API_URL } from '@/lib/api';
import { spacing } from '@/theme';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { readDiagnostics } from '@/lib/diagnostics';
import { copy, mobileLocale } from '@/lib/i18n';

export default function CompteScreen() {
  const session = useSession();
  const { refresh, signOut } = useAuth();
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
  const [deletePassword, setDeletePassword] = React.useState('');
  const acting = React.useRef(false);
  const changingEmail = email.trim().toLowerCase() !== session.user.email;

  async function perform(fn: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true; setBusy(true); setError(null); setNotice(null);
    try { await fn(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Réessayez dans un instant. Vos saisies sont conservées.'); }
    finally { acting.current = false; setBusy(false); }
  }

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
    <Screen>
      <Heading>{en ? 'Your account and details' : 'Votre compte, vos informations'}</Heading>
      <Muted>{en ? 'Update your details without changing your plan. Your quotes and subscription remain on the same account.' : 'Vous pouvez corriger vos coordonnées sans choisir un abonnement. Vos devis et votre formule restent associés au même compte.'}</Muted>
      {error ? <Banner tone="danger" title={error} /> : null}
      {notice ? <Banner title={notice} /> : null}
      <Card style={{ gap: spacing.lg }}>
        <Heading>{en ? 'Identity' : 'Identité'}</Heading>
        <Field label={en ? 'First name' : 'Prénom'} value={firstName} onChangeText={setFirstName} autoComplete="given-name" maxLength={80} editable={!busy} />
        <Field label={en ? 'Last name' : 'Nom'} value={lastName} onChangeText={setLastName} autoComplete="family-name" maxLength={80} editable={!busy} />
        <Button title={en ? 'Save my name' : 'Enregistrer mon nom'} disabled={busy} onPress={() => void perform(async () => { await api.auth.updateName(firstName, lastName); await refresh(); setNotice(en ? 'Your name was saved.' : 'Votre nom a été enregistré.'); })} />
      </Card>
      <Card style={{ gap: spacing.lg }}>
        <Heading>{en ? 'Sign-in address' : 'Adresse de connexion'}</Heading>
        <Muted>{session.user.emailVerified ? (en ? 'Current address confirmed.' : 'Adresse actuelle confirmée.') : (en ? 'Confirm your address to protect your account.' : 'Confirmez votre adresse pour sécuriser votre compte.')}</Muted>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!busy} />
        {changingEmail ? <>
          <Field label={en ? 'Current password' : 'Mot de passe actuel'} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy} />
          <Muted>{en ? 'Your current address remains usable until the new one is confirmed. Other devices will sign out after the change.' : 'Votre adresse actuelle reste utilisable jusqu’à la confirmation de la nouvelle. Les autres appareils seront déconnectés après ce changement.'}</Muted>
        </> : null}
        <Button title={destination ? copy(locale, 'resend') : (en ? 'Get a confirmation code' : 'Recevoir un code de confirmation')} variant="secondary" disabled={busy || !email.trim() || (changingEmail && !password)} onPress={() => void perform(async () => {
          const result = await api.auth.requestEmailCode(email, changingEmail ? password : undefined);
          setDestination(result.email); setPassword(''); setCode('');
          setNotice(en ? `Code sent to ${result.email}. Check your spam folder too.` : `Code envoyé à ${result.email}. Vérifiez aussi vos courriers indésirables.`);
        })} />
        <Muted>{en ? 'Code valid for 10 minutes. Wait at least one minute between requests.' : 'Code valable 10 minutes. Patientez au moins une minute entre deux demandes.'}</Muted>
        <Field label={en ? 'Email code' : 'Code reçu par email'} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!busy} />
        <Button title={en ? 'Confirm my email' : 'Confirmer mon email'} disabled={busy || code.length !== 6} onPress={() => void perform(async () => {
          await api.auth.confirmEmailCode(code); await refresh();
          if (destination) setEmail(destination);
          setDestination(null); setCode(''); setNotice(en ? 'Your email address is confirmed.' : 'Votre adresse email est confirmée.');
        })} />
      </Card>
      <Button title={en ? 'Sign out / use another account' : 'Me déconnecter / utiliser un autre compte'} variant="ghost" disabled={busy} onPress={() => void perform(signOut)} />
      <Card style={{ gap: spacing.lg }}>
        <Heading>{copy(locale, 'language')}</Heading>
        <Muted>{en ? 'Your choice is saved to your account and guides generated answers and documents.' : 'Votre choix est conservé sur votre compte et guide les réponses et documents générés.'}</Muted>
        <Button title={session.user.locale === 'fr' ? `✓ ${copy(locale, 'french')}` : copy(locale, 'french')} variant={session.user.locale === 'fr' ? 'primary' : 'secondary'} disabled={busy || session.user.locale === 'fr'} onPress={() => void perform(async () => { await api.auth.updateLanguage('fr'); await refresh(); setNotice('Langue française enregistrée.'); })} />
        <Button title={session.user.locale === 'en' ? `✓ ${copy(locale, 'english')}` : copy(locale, 'english')} variant={session.user.locale === 'en' ? 'primary' : 'secondary'} disabled={busy || session.user.locale === 'en'} onPress={() => void perform(async () => { await api.auth.updateLanguage('en'); await refresh(); setNotice('English language saved.'); })} />
      </Card>
      <Card style={{ gap: spacing.lg }}>
        <Heading>Confidentialité et assistance</Heading>
        <Button title="Partager le diagnostic technique" variant="ghost" onPress={() => void perform(async () => { await Share.share({ message: JSON.stringify({ app: 'DEVISERA', events: readDiagnostics() }, null, 2) }); })} />
        <Muted>Diagnostic local : durées et catégories d’erreurs, sans nom de client, description de chantier ni jeton de connexion.</Muted>
        <Button title="Exporter mes informations de compte" disabled={busy} variant="secondary" onPress={() => void perform(async () => {
          if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
          const data = await api.auth.exportPersonal();
          const file = new File(Paths.cache, `DEVISERA-compte-${Date.now()}.json`);
          try {
            file.write(JSON.stringify(data, null, 2));
            await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
          } finally { if (file.exists) file.delete(); }
        })} />
        <Muted>Cet export contient votre identité et vos rattachements à une entreprise, pas les devis ni le dossier commercial complet.</Muted>
        <Button title="Exporter mes données commerciales" disabled={busy} variant="secondary" onPress={() => void perform(async () => {
          if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
          const data = await api.auth.exportBusiness();
          const file = new File(Paths.cache, `DEVISERA-donnees-${Date.now()}.json`);
          try { file.write(JSON.stringify(data, null, 2)); await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' }); }
          finally { if (file.exists) file.delete(); }
        })} />
        <Muted>Clients, prospects, chantiers, devis, lignes et factures. Aucun secret ou jeton n’est inclus.</Muted>
        <Muted>Pour demander une copie de vos données ou leur effacement, contactez-nous. Une vérification d’identité et un examen des obligations de conservation sont nécessaires.</Muted>
        <Heading>{copy(locale, 'payments')}</Heading>
        <Muted>{en ? 'Apple subscriptions are managed by Apple. Open your Apple account to view purchase history, receipts and renewals.' : 'Les abonnements Apple sont gérés par Apple. Ouvrez votre compte Apple pour consulter l’historique des achats, les reçus et les renouvellements.'}</Muted>
        <Button title={copy(locale, 'manageApple')} variant="secondary" disabled={busy} onPress={() => void perform(() => Linking.openURL('https://apps.apple.com/account/subscriptions'))} />
        <Button title={en ? 'View Apple purchases' : 'Voir mes achats Apple'} variant="ghost" disabled={busy} onPress={() => void perform(() => Linking.openURL('https://reportaproblem.apple.com/'))} />
        <Heading>{en ? 'Your feedback' : 'Votre avis'}</Heading>
        <Muted>{en ? 'Your feedback helps DEVISERA improve.' : 'Votre retour aide DEVISERA à progresser.'}</Muted>
        <Button title={copy(locale, 'rate')} variant="secondary" disabled={busy} onPress={() => void perform(() => Linking.openURL('itms-apps://itunes.apple.com/app/id6806865251?action=write-review'))} />
        <Heading>{copy(locale, 'contact')}</Heading>
        <Muted>{en ? 'Questions or a problem? Write to us from your usual mail app.' : 'Une question ou un problème ? Écrivez-nous depuis votre messagerie habituelle.'}</Muted>
        <Button title={copy(locale, 'support')} variant="secondary" disabled={busy} onPress={() => void perform(() => Linking.openURL(`mailto:contact@devisera.fr?subject=${encodeURIComponent('DEVISERA support')}&body=${encodeURIComponent(`${en ? 'Hello' : 'Bonjour'},\n\nDEVISERA version: 1.0.0\nLanguage: ${session.user.locale}\nAccount: ${session.user.id}\n\n${en ? 'My request:' : 'Ma demande :'}`)}`))} />
        <Heading>Supprimer mon compte</Heading>
        <Muted>Cette action désactive votre accès, révoque vos sessions et anonymise vos informations personnelles. Les données commerciales peuvent être conservées lorsqu’une obligation légale ou un autre membre de l’entreprise l’exige.</Muted>
        <Field label="Mot de passe actuel" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry editable={!busy} />
        <Button title="Supprimer définitivement mon accès" variant="danger" disabled={busy || !deletePassword} onPress={() => void perform(async () => {
          const result = await api.auth.deleteAccount(deletePassword);
          setDeletePassword('');
          setNotice(result.businessRecordsRetained ? 'Votre accès a été supprimé. Les données commerciales restent conservées selon les obligations applicables.' : 'Votre compte a été supprimé.');
          await signOut();
        })} />
        <Button title="Politique de confidentialité" variant="ghost" onPress={() => void perform(() => Linking.openURL(`${API_URL}/confidentialite`))} />
        <Button title="Conditions d’utilisation" variant="ghost" onPress={() => void perform(() => Linking.openURL(`${API_URL}/conditions`))} />
      </Card>
    </Screen>
  </KeyboardAvoidingView>;
}
