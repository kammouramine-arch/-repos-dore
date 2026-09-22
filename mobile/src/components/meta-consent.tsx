import * as React from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { metaConfigured, metaConsented, setMetaConsent } from '@/lib/meta-events';
import { useMobileLocale } from '@/lib/i18n';
import { colors } from '@/theme';

/** Optional and reversible. Never gates account creation, trial, or app access. */
export function MetaConsent() {
  const en = useMobileLocale() === 'en';
  const [allowed, setAllowed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { void metaConsented().then(setAllowed).catch(() => undefined); }, []);
  if (!metaConfigured) return null;
  async function choose(allow: boolean) {
    setBusy(true);
    try {
      const result = await setMetaConsent(allow);
      setAllowed(result);
      if (allow && !result) Alert.alert(en ? 'Tracking remains off' : 'La mesure reste désactivée', en ? 'iOS has not authorized tracking. You can keep using DEVISERA normally.' : 'iOS n’a pas autorisé le suivi. Vous pouvez utiliser DEVISERA normalement.');
    } catch { setAllowed(false); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 8, padding: 12 }}>
    <Text style={{ color: colors.ink, fontWeight: '600' }}>{en ? 'Advertising measurement (optional)' : 'Mesure publicitaire (facultative)'}</Text>
    <Text style={{ color: colors.subtle, fontSize: 13 }}>{en
      ? 'With your permission and iOS authorization, share registration, trial and subscription events, product, amount, currency and device advertising data with Meta to measure DEVISERA ads. No quotes, recordings, customer details, email or phone are sent by this integration. You can withdraw here at any time; this does not delete data already sent.'
      : 'Avec votre accord et l’autorisation iOS, partagez avec Meta l’inscription, l’essai et les achats d’abonnement, le produit, le montant, la devise et les données publicitaires de l’appareil pour mesurer les publicités DEVISERA. Cette intégration n’envoie aucun devis, enregistrement, détail client, email ou téléphone. Retirez votre accord ici à tout moment ; cela ne supprime pas les données déjà transmises.'}</Text>
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.facebook.com/privacy/policy/')}><Text style={{ color: colors.accent }}>{en ? 'Meta privacy policy' : 'Confidentialité chez Meta'}</Text></Pressable>
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void choose(!allowed)}>
      <Text style={{ color: colors.accent, paddingVertical: 8 }}>{allowed ? (en ? 'Withdraw permission' : 'Retirer mon accord') : (en ? 'Allow measurement' : 'Autoriser la mesure')}</Text>
    </Pressable>
    {!allowed && <Text style={{ color: colors.subtle }}>{en ? 'Off by default. Continue without allowing to refuse.' : 'Désactivée par défaut. Continuez sans autoriser pour refuser.'}</Text>}
  </View>;
}
