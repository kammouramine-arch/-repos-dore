import * as React from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Button, Muted } from './ui';
import { readDiagnostics } from '@/lib/diagnostics';
import { appleProducts } from '@/lib/apple-purchases';
import { Logo } from './logo';
import { storekitReportEvents } from '@/lib/storekit-report';

/** Explicit support view, never debug text embedded in the sales cards. */
export function DiagnosticReport({ en }: { en: boolean }) {
  const [report, setReport] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const capture = () => JSON.stringify({ app: 'DEVISERA', version: Constants.expoConfig?.version,
    build: Constants.nativeBuildVersion, capturedAt: new Date().toISOString(),
    note: 'Native cache internals are unknown. No receipts, transactions or account data are included.',
    events: storekitReportEvents(readDiagnostics()) }, null, 2);
  if (!Constants.expoConfig?.extra?.storekitDiagnostics) return null;
  return <>
    <Pressable delayLongPress={1800} onLongPress={() => {
      setFailed(false);
      setReport(capture());
    }} accessibilityLabel="DEVISERA"><Logo size={30} /></Pressable>
    <Modal visible={report !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReport(null)}>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, backgroundColor: 'white', gap: 12 }}>
        <Muted>{en ? 'Share this report with support. It contains technical events, not passwords, verification codes or receipts.' : 'Partagez ce rapport avec le support. Il contient des événements techniques, pas de mot de passe, de code de vérification ni de reçu.'}</Muted>
        {failed ? <Muted>{en ? 'Sharing is unavailable. You can select and copy the report below.' : 'Le partage est indisponible. Vous pouvez sélectionner et copier le rapport ci-dessous.'}</Muted> : null}
        <ScrollView><Text selectable style={{ fontSize: 12, color: '#152039' }}>{report}</Text></ScrollView>
        <Button title={en ? 'Fetch current Apple products' : 'Charger les produits Apple actuels'} loading={loading} disabled={loading} onPress={() => {
          setLoading(true);
          void appleProducts(true).catch(() => {}).finally(() => { setReport(capture()); setLoading(false); });
        }} />
        <Button title={en ? 'Copy diagnostic report' : 'Copier le rapport de diagnostic'} onPress={() => { void Clipboard.setStringAsync(report ?? '').then(() => Alert.alert(en ? 'Report copied' : 'Rapport copié')).catch(() => setFailed(true)); }} />
        <Button variant="secondary" title={en ? 'Close' : 'Fermer'} onPress={() => setReport(null)} />
      </View>
    </Modal>
  </>;
}
