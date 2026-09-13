import * as React from 'react';
import { Alert, Linking, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AI_PROVIDER_NAMES } from '@devisia/shared';
import { Banner, Body, Button, Card, Caption, Heading, Muted, Screen } from '@/components/ui';
import { SettingsGroup, SettingsRow, StatusChip } from '@/components/settings';
import { useToast } from '@/components/toast';
import { useAiConsent } from '@/lib/ai-consent';
import { useSession } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { mobileLocale } from '@/lib/i18n';
import { aiConsentText } from '@/features/ai-consent';
import { colors, radius, spacing } from '@/theme';

/**
 * « Confidentialité et IA » : l'état de l'autorisation, ce qui part, vers qui,
 * et le retrait en un geste.
 *
 * Après un retrait, plus aucune requête ne part vers le fournisseur : la
 * prochaine action assistée redemande l'autorisation, avec le même texte.
 */
export default function ConfidentialiteIaScreen() {
  const session = useSession();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const { state, ensure, revoke } = useAiConsent();
  const copy = aiConsentText(state, locale);
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const providerName = AI_PROVIDER_NAMES[state.provider === 'local' ? 'gemini' : state.provider][locale];
  const decidedAt = state.consent.decidedAt
    ? new Date(state.consent.decidedAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const openPolicy = () => void WebBrowser.openBrowserAsync(`${API_URL}/confidentialite`).catch(() => Linking.openURL(`${API_URL}/confidentialite`));

  async function allow() {
    if (busy) return;
    setBusy(true);
    try {
      const allowed = await ensure();
      if (allowed) toast({ title: en ? 'AI allowed' : 'IA autorisée', description: en ? 'Your permission is saved for this account.' : 'Votre autorisation est enregistrée pour ce compte.', tone: 'success' });
    } finally {
      setBusy(false);
    }
  }

  function withdraw() {
    Alert.alert(
      en ? 'Withdraw your permission?' : 'Retirer votre autorisation ?',
      en
        ? 'DEVISERA will stop sending your data to the AI provider. AI-assisted preparation will ask again before any future use.'
        : 'DEVISERA cessera tout envoi de vos données au fournisseur d’IA. La préparation assistée redemandera votre autorisation avant toute utilisation.',
      [
        { text: en ? 'Cancel' : 'Annuler', style: 'cancel' },
        {
          text: en ? 'Withdraw' : 'Retirer',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            revoke()
              .then(() => toast({ title: en ? 'Permission withdrawn' : 'Autorisation retirée', description: en ? 'No more data will be sent to the AI provider.' : 'Plus aucune donnée ne sera transmise au fournisseur d’IA.', tone: 'success' }))
              .catch(() => toast({ title: en ? 'Withdrawal failed' : 'Retrait impossible', description: en ? 'Check your connection and try again.' : 'Vérifiez la connexion et réessayez.', tone: 'error' }))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Heading>{copy.title}</Heading>
          <Muted>{en ? 'Your choice applies to this account in this business, on every device.' : 'Votre choix vaut pour ce compte dans cette entreprise, sur tous vos appareils.'}</Muted>
        </View>

        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Caption upper style={{ color: colors.muted }}>{en ? 'Permission' : 'Autorisation'}</Caption>
              <Body style={{ fontWeight: '600' }}>{state.granted ? copy.stateGranted : copy.stateNotGranted}</Body>
              {decidedAt ? <Muted style={{ fontSize: 13 }}>{en ? `Decided on ${decidedAt}` : `Décision du ${decidedAt}`}</Muted> : null}
            </View>
            <StatusChip tone={state.granted ? 'success' : 'neutral'} icon={state.granted ? 'checkmark-circle' : 'pause-circle-outline'} label={state.granted ? copy.stateGranted : copy.stateNotGranted} />
          </View>
          {!state.required ? (
            <Banner tone="info" title={en ? 'No external provider is active: nothing leaves DEVISERA.' : 'Aucun fournisseur externe n’est actif : rien ne quitte DEVISERA.'} />
          ) : state.granted ? (
            <Button title={en ? 'Withdraw my permission' : 'Retirer mon autorisation'} variant="secondary" icon="close-circle-outline" disabled={busy} loading={busy} onPress={withdraw} />
          ) : (
            <Button title={en ? 'Allow AI' : 'Autoriser l’IA'} icon="sparkles-outline" disabled={busy} loading={busy} onPress={() => void allow()} accessibilityHint={en ? 'Shows the consent text first' : 'Affiche d’abord le texte de consentement'} />
          )}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Caption upper style={{ color: colors.muted }}>{en ? 'Recipient' : 'Destinataire'}</Caption>
            <Body style={{ fontWeight: '600' }}>{providerName}</Body>
          </View>
          <Body>{copy.intro}</Body>
          <View style={{ gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
            <Caption upper style={{ color: colors.muted }}>{en ? 'What is sent' : 'Ce qui est transmis'}</Caption>
            {copy.sent.map((line) => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.accent} style={{ marginTop: 2 }} />
                <Body style={{ flex: 1 }}>{line}</Body>
              </View>
            ))}
          </View>
          <Body>{copy.purpose}</Body>
          <Muted>{en ? 'Voice dictation runs on your device: no audio is sent. Only the resulting text is transmitted, with your permission.' : 'La dictée vocale s’exécute sur votre appareil : aucun enregistrement audio n’est transmis. Seul le texte obtenu est envoyé, avec votre autorisation.'}</Muted>
        </Card>

        <SettingsGroup title={en ? 'Learn more' : 'En savoir plus'}>
          <SettingsRow icon="shield-checkmark-outline" title={en ? 'Privacy policy' : 'Politique de confidentialité'} subtitle={en ? 'Data, providers, retention and your rights' : 'Données, prestataires, conservation et vos droits'} onPress={openPolicy} />
        </SettingsGroup>
      </View>
    </Screen>
  );
}
