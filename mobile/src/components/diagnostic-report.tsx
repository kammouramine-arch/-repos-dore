import * as React from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Button, Muted } from './ui';
import { readDiagnostics } from '@/lib/diagnostics';
import { appleProducts } from '@/lib/apple-purchases';
import { Logo } from './logo';
import { storekitReportEvents } from '@/lib/storekit-report';
import { inspectAndCompareStorekit } from '@/lib/native-storekit';
import { describeStorekitComparison, type StorekitComparison } from '@/lib/storekit-compare';
import { nativeStorekitAvailable } from '../../modules/devisera-storekit';

/** Explicit support view, never debug text embedded in the sales cards. */
export function DiagnosticReport({ en, storefront }: { en: boolean; storefront?: string }) {
  const [report, setReport] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [comparing, setComparing] = React.useState(false);
  const [summary, setSummary] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<StorekitComparison[]>([]);
  const [nativeStorefront, setNativeStorefront] = React.useState<string>('');
  const [nativeModule, setNativeModule] = React.useState<'unknown' | 'embedded' | 'absent'>('unknown');
  React.useEffect(() => {
    let disposed = false;
    void nativeStorekitAvailable().then((available) => { if (!disposed) setNativeModule(available ? 'embedded' : 'absent'); });
    return () => { disposed = true; };
  }, []);
  const capture = (lines: string[] = summary) => JSON.stringify({ app: 'DEVISERA', version: Constants.expoConfig?.version,
    build: Constants.nativeBuildVersion, commit: Constants.expoConfig?.extra?.commit ?? null, profile: Constants.expoConfig?.extra?.buildProfile ?? null, capturedAt: new Date().toISOString(),
    directStorekitModule: nativeModule,
    note: 'Native cache internals are unknown. No receipts, transactions or account data are included.',
    comparison: lines,
    events: storekitReportEvents(readDiagnostics()) }, null, 2);
  const compare = () => {
    setComparing(true);
    void appleProducts(true).catch(() => null).then(async (offers) => {
      const result = await inspectAndCompareStorekit(offers?.products ?? []);
      const lines = result ? [
        `${en ? 'Wrapper storefront' : 'Vitrine (bibliothèque)'}: ${offers?.storefront ?? 'unknown'} · ${en ? 'Direct StoreKit storefront' : 'Vitrine (StoreKit direct)'}: ${result.inspection.storefrontCountry || 'unknown'} (${result.inspection.storefrontId || '?'})`,
        ...result.comparisons.map((c) => `${c.productId} · ${en ? 'wrapper' : 'bibliothèque'} ${c.wrapperDisplayPrice ?? '—'} ${c.wrapperCurrency ?? ''} · direct ${c.nativeDisplayPrice ?? '—'} ${c.nativeCurrency ?? ''} · catalogue ${c.catalogPriceFormatted ?? '—'} ${c.catalogCurrency ?? ''} ${c.catalogPath ?? ''} · intro ${c.nativeIntroOffer === null ? '?' : c.nativeIntroOffer ? 'yes' : 'no'}`),
        ...result.comparisons.map((c) => describeStorekitComparison(c, en)),
      ] : [en ? 'Direct StoreKit inspection failed or is not embedded in this build.' : 'La lecture StoreKit directe a échoué ou n’est pas embarquée dans cette version.'];
      setRows(result?.comparisons ?? []); setNativeStorefront(result ? `${result.inspection.storefrontCountry || '?'} (${result.inspection.storefrontId || '?'})` : '');
      setSummary(lines); setReport(capture(lines));
    }).finally(() => setComparing(false));
  };
  const open = () => { setFailed(false); setReport(capture()); };
  if (!Constants.expoConfig?.extra?.storekitDiagnostics) return null;
  return <>
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Pressable delayLongPress={1800} onLongPress={open} accessibilityLabel="DEVISERA"><Logo size={30} /></Pressable>
      {/* Version de diagnostic : l'entrée est visible, pas seulement cachée derrière un appui long. */}
      <Pressable accessibilityRole="button" onPress={open} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C8D2FF' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#2341C6' }}>{en ? 'StoreKit diagnostics' : 'Diagnostic StoreKit'} · {Constants.nativeBuildVersion ?? '?'}{Constants.expoConfig?.extra?.commit ? ` · ${Constants.expoConfig.extra.commit}` : ''}</Text>
      </Pressable>
    </View>
    <Modal visible={report !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReport(null)}>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, backgroundColor: 'white', gap: 12 }}>
        <Muted>{en ? 'Share this report with support. It contains technical events, not passwords, verification codes or receipts.' : 'Partagez ce rapport avec le support. Il contient des événements techniques, pas de mot de passe, de code de vérification ni de reçu.'}</Muted>
        {failed ? <Muted>{en ? 'Sharing is unavailable. You can select and copy the report below.' : 'Le partage est indisponible. Vous pouvez sélectionner et copier le rapport ci-dessous.'}</Muted> : null}
        <ScrollView>
          {rows.length ? <View style={{ gap: 6, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#152039' }}>{en ? 'Side by side' : 'Côte à côte'} · {en ? 'wrapper storefront' : 'vitrine bibliothèque'} {storefront ?? '?'} · {en ? 'direct storefront' : 'vitrine directe'} {nativeStorefront || '?'}</Text>
            {rows.map((c) => (
              <View key={c.productId} style={{ flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#E8ECF2', borderRadius: 10, padding: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#667085' }}>{en ? 'WRAPPER (expo-iap)' : 'BIBLIOTHÈQUE (expo-iap)'}</Text>
                  <Text style={{ fontSize: 12, color: '#152039' }}>{c.productId}</Text>
                  <Text style={{ fontSize: 12, color: '#152039' }}>{c.wrapperDisplayPrice ?? '—'} · {c.wrapperCurrency ?? '—'}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#667085' }}>{en ? 'DIRECT STOREKIT 2' : 'STOREKIT 2 DIRECT'}</Text>
                  <Text style={{ fontSize: 12, color: '#152039' }}>{c.productId}</Text>
                  <Text style={{ fontSize: 12, color: '#152039' }}>{c.nativeDisplayPrice ?? '—'} · {c.nativeCurrency ?? '—'}</Text>
                  <Text style={{ fontSize: 11, color: '#667085' }}>{c.verdict}</Text>
                </View>
              </View>
            ))}
          </View> : null}
          <Text selectable style={{ fontSize: 12, color: '#152039' }}>{report}</Text>
        </ScrollView>
        <Button title={en ? 'Fetch current Apple products' : 'Charger les produits Apple actuels'} loading={loading} disabled={loading} onPress={() => {
          setLoading(true);
          void appleProducts(true).catch(() => {}).finally(() => { setReport(capture()); setLoading(false); });
        }} />
        <Button title={en ? 'Compare with StoreKit directly' : 'Comparer avec StoreKit en direct'} variant="secondary" loading={comparing} disabled={comparing || nativeModule !== 'embedded'} onPress={compare} />
        <Button title={en ? 'Copy diagnostic report' : 'Copier le rapport de diagnostic'} onPress={() => { void Clipboard.setStringAsync(report ?? '').then(() => Alert.alert(en ? 'Report copied' : 'Rapport copié')).catch(() => setFailed(true)); }} />
        <Button variant="secondary" title={en ? 'Close' : 'Fermer'} onPress={() => setReport(null)} />
      </View>
    </Modal>
  </>;
}
