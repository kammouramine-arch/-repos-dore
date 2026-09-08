import * as React from 'react';
import { Modal, ScrollView, Share, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, Muted } from './ui';
import { readDiagnostics } from '@/lib/diagnostics';

/** Explicit support view, never debug text embedded in the sales cards. */
export function DiagnosticReport({ en }: { en: boolean }) {
  const [report, setReport] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  return <>
    <Button variant="ghost" title={en ? 'Support diagnostic' : 'Diagnostic pour le support'} onPress={() => {
      setFailed(false);
      setReport(JSON.stringify({ app: 'DEVISERA', version: Constants.expoConfig?.version, events: readDiagnostics() }, null, 2));
    }} />
    <Modal visible={report !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReport(null)}>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, backgroundColor: 'white', gap: 12 }}>
        <Muted>{en ? 'Share this report with support. It contains technical events, not passwords, verification codes or receipts.' : 'Partagez ce rapport avec le support. Il contient des événements techniques, pas de mot de passe, de code de vérification ni de reçu.'}</Muted>
        {failed ? <Muted>{en ? 'Sharing is unavailable. You can select and copy the report below.' : 'Le partage est indisponible. Vous pouvez sélectionner et copier le rapport ci-dessous.'}</Muted> : null}
        <ScrollView><Text selectable style={{ fontSize: 12, color: '#152039' }}>{report}</Text></ScrollView>
        <Button title={en ? 'Share report' : 'Partager le rapport'} onPress={() => { void Share.share({ message: report ?? '' }).catch(() => setFailed(true)); }} />
        <Button variant="secondary" title={en ? 'Close' : 'Fermer'} onPress={() => setReport(null)} />
      </View>
    </Modal>
  </>;
}
