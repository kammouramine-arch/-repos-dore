import * as React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Banner, Button, Card, Field, Heading, Muted, Screen } from '@/components/ui';
import { useAuth, useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { spacing } from '@/theme';

export default function CompteScreen() {
  const session = useSession();
  const { refresh, signOut } = useAuth();
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
      <Heading>Votre compte, vos informations</Heading>
      <Muted>Vous pouvez corriger vos coordonnées sans choisir un abonnement. Vos devis et votre formule restent associés au même compte.</Muted>
      {error ? <Banner tone="danger" title={error} /> : null}
      {notice ? <Banner title={notice} /> : null}
      <Card style={{ gap: spacing.lg }}>
        <Heading>Identité</Heading>
        <Field label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="given-name" maxLength={80} editable={!busy} />
        <Field label="Nom" value={lastName} onChangeText={setLastName} autoComplete="family-name" maxLength={80} editable={!busy} />
        <Button title="Enregistrer mon nom" disabled={busy} onPress={() => void perform(async () => { await api.auth.updateName(firstName, lastName); await refresh(); setNotice('Votre nom a été enregistré.'); })} />
      </Card>
      <Card style={{ gap: spacing.lg }}>
        <Heading>Adresse de connexion</Heading>
        <Muted>{session.user.emailVerified ? 'Adresse actuelle confirmée.' : 'Confirmez votre adresse pour sécuriser votre compte.'}</Muted>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!busy} />
        {changingEmail ? <>
          <Field label="Mot de passe actuel" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy} />
          <Muted>Votre adresse actuelle reste utilisable jusqu’à la confirmation de la nouvelle. Les autres appareils seront déconnectés après ce changement.</Muted>
        </> : null}
        <Button title={destination ? 'Renvoyer un code' : 'Recevoir un code de confirmation'} variant="secondary" disabled={busy || !email.trim() || (changingEmail && !password)} onPress={() => void perform(async () => {
          const result = await api.auth.requestEmailCode(email, changingEmail ? password : undefined);
          setDestination(result.email); setPassword(''); setCode('');
          setNotice(`Code envoyé à ${result.email}. Vérifiez aussi vos courriers indésirables.`);
        })} />
        <Muted>Code valable 10 minutes. Patientez au moins une minute entre deux demandes.</Muted>
        <Field label="Code reçu par email" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!busy} />
        <Button title="Confirmer mon email" disabled={busy || code.length !== 6} onPress={() => void perform(async () => {
          await api.auth.confirmEmailCode(code); await refresh();
          if (destination) setEmail(destination);
          setDestination(null); setCode(''); setNotice('Votre adresse email est confirmée.');
        })} />
      </Card>
      <Button title="Me déconnecter / utiliser un autre compte" variant="ghost" disabled={busy} onPress={() => void perform(signOut)} />
    </Screen>
  </KeyboardAvoidingView>;
}
