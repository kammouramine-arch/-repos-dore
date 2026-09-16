import * as React from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatCents, type AccountingExportSummaryDTO } from '@devisia/shared';
import { Body, Button, Caption, Card, Divider, Screen, SectionHeader, Skeleton, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { useMobileLocale } from '@/lib/i18n';
import { useToast } from '@/components/toast';
import { colors, radius, spacing } from '@/theme';

/**
 * Export comptable.
 *
 * Ce que l'artisan fait vraiment : une fois par mois ou par trimestre, il
 * envoie à son comptable ce qui est entré et ce qui est sorti. L'écran est
 * donc construit autour d'un choix de période et d'un seul bouton d'envoi,
 * pas autour d'une configuration.
 *
 * Les chiffres affichés avant l'envoi viennent du serveur : l'artisan voit
 * ce qu'il envoie avant de l'envoyer, et repère tout de suite un mois vide
 * ou un montant aberrant.
 */

type Period = { id: string; label: { fr: string; en: string }; from: Date; to: Date };

/** Périodes réellement utilisées en comptabilité artisanale. */
function periods(now = new Date()): Period[] {
  const startOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const endOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  const quarter = Math.floor(now.getMonth() / 3);
  return [
    { id: 'mois', label: { fr: 'Ce mois-ci', en: 'This month' }, from: startOfMonth(0), to: endOfMonth(0) },
    { id: 'precedent', label: { fr: 'Mois dernier', en: 'Last month' }, from: startOfMonth(-1), to: endOfMonth(-1) },
    {
      id: 'trimestre',
      label: { fr: 'Ce trimestre', en: 'This quarter' },
      from: new Date(now.getFullYear(), quarter * 3, 1),
      to: new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59),
    },
    {
      id: 'annee',
      label: { fr: 'Cette année', en: 'This year' },
      from: new Date(now.getFullYear(), 0, 1),
      to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    },
  ];
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}>
      <Body style={{ flex: 1, color: strong ? colors.ink : colors.muted, fontWeight: strong ? '600' : '400' }}>
        {label}
      </Body>
      <Text style={{ fontSize: strong ? 17 : 15, fontWeight: strong ? '700' : '600', color: colors.ink }}>
        {value}
      </Text>
    </View>
  );
}

export default function ComptableScreen() {
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const options = React.useMemo(() => periods(), []);

  const [selected, setSelected] = React.useState(options[1]!.id);
  const [sending, setSending] = React.useState(false);
  const sendingRef = React.useRef(false);

  const period = options.find((option) => option.id === selected)!;

  /*
   * Aperçu de la période.
   *
   * Passe par le même crochet de requête que le reste de l'application : il
   * gère le chargement, l'erreur et l'annulation quand on change de période
   * avant la fin de la requête précédente.
   */
  const query = useQuery<AccountingExportSummaryDTO>(
    () => api.accounting.preview(period.from.toISOString(), period.to.toISOString()),
    [period.id],
    `comptable:${period.id}`,
  );
  const summary = query.data;

  /**
   * Construit les CSV puis ouvre la feuille de partage d'iOS.
   *
   * Les fichiers sont écrits dans le cache : ils partent vers Mail, Drive ou
   * n'importe quelle application choisie par l'artisan, et iOS les nettoie
   * ensuite. DEVISERA n'envoie rien à personne d'elle-même.
   */
  async function send() {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const result = await api.accounting.build({
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        datasets: ['sales', 'expenses', 'payments'],
        includeDocuments: false,
      });

      // expo-file-system 57 : les fichiers passent par les classes `Directory`
      // et `File`. Le cache convient — iOS le vide tout seul, et ces CSV n'ont
      // pas à survivre au partage.
      const directory = new Directory(Paths.cache, 'export-comptable');
      if (!directory.exists) directory.create({ intermediates: true });
      const uris: string[] = [];
      for (const entry of result.files) {
        const file = new File(directory, entry.name);
        if (file.exists) file.delete();
        file.create();
        file.write(entry.content);
        uris.push(file.uri);
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

      // La feuille native ne prend qu'un fichier à la fois : on les propose
      // l'un après l'autre plutôt que d'en perdre deux sur trois.
      if (await Sharing.isAvailableAsync()) {
        for (const uri of uris) {
          await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
        }
      } else {
        await Share.share({ message: result.files.map((entry) => entry.content).join('\n\n') });
      }
    } catch (cause) {
      toast({
        title:
          cause instanceof Error
            ? cause.message
            : en
              ? 'The export could not be sent.'
              : 'L’export n’a pas pu être envoyé.',
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const empty = summary != null && summary.salesCount === 0 && summary.expenseCount === 0 && summary.paymentCount === 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['3xl'] }}>
        <Card style={{ gap: spacing.sm }}>
          <Title style={{ fontSize: 21 }}>{en ? 'Send to your accountant' : 'Envoyer à votre comptable'}</Title>
          <Body style={{ color: colors.muted, lineHeight: 22 }}>
            {en
              ? 'Three files: sales, expenses and payments over the period you choose. They open directly in Excel.'
              : 'Trois fichiers : ventes, dépenses et encaissements sur la période choisie. Ils s’ouvrent directement dans Excel.'}
          </Body>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Period' : 'Période'}
          </Caption>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {options.map((option) => {
              const active = option.id === selected;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    void Haptics.selectionAsync().catch(() => undefined);
                    setSelected(option.id);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    height: 42,
                    justifyContent: 'center',
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.accent : colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: active ? colors.white : colors.inkSoft }}>
                    {en ? option.label.en : option.label.fr}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {query.error ? (
          <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft, gap: spacing.sm }}>
            <Body style={{ color: colors.warning }}>{query.error}</Body>
          </Card>
        ) : query.loading && !summary ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton height={14} width="40%" />
            <Skeleton height={20} width="70%" />
            <Skeleton height={20} width="55%" />
          </Card>
        ) : summary ? (
          <Card style={{ gap: spacing.md }}>
            <SectionHeader title={en ? 'What will be sent' : 'Ce qui sera envoyé'} />
            {empty ? (
              <Body style={{ color: colors.muted }}>
                {en
                  ? 'Nothing was recorded over this period. Pick another one.'
                  : 'Rien n’a été enregistré sur cette période. Choisissez-en une autre.'}
              </Body>
            ) : (
              <>
                <Row
                  label={en ? `Sales · ${summary.salesCount} invoice${summary.salesCount === 1 ? '' : 's'}` : `Ventes · ${summary.salesCount} facture${summary.salesCount === 1 ? '' : 's'}`}
                  value={formatCents(summary.salesTotalCents)}
                />
                <Row label={en ? 'of which VAT' : 'dont TVA'} value={formatCents(summary.salesVatCents)} />
                <Divider />
                <Row
                  label={en ? `Expenses · ${summary.expenseCount} receipt${summary.expenseCount === 1 ? '' : 's'}` : `Dépenses · ${summary.expenseCount} justificatif${summary.expenseCount === 1 ? '' : 's'}`}
                  value={formatCents(summary.expenseTotalCents)}
                />
                <Row label={en ? 'of which VAT' : 'dont TVA'} value={formatCents(summary.expenseVatCents)} />
                <Divider />
                <Row
                  label={en ? `Payments received · ${summary.paymentCount}` : `Encaissements · ${summary.paymentCount}`}
                  value={formatCents(summary.paymentTotalCents)}
                  strong
                />
              </>
            )}
          </Card>
        ) : null}

        <Button
          title={en ? 'Send the three files' : 'Envoyer les trois fichiers'}
          icon="share-outline"
          haptic
          loading={sending}
          disabled={!summary || empty || query.error != null}
          onPress={() => void send()}
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.xs }}>
          <Ionicons name="information-circle-outline" size={18} color={colors.subtle} style={{ marginTop: 1 }} />
          <Caption style={{ flex: 1, color: colors.subtle, lineHeight: 17 }}>
            {en
              ? 'DEVISERA sends nothing on your behalf. The files are handed to the app you choose — Mail, Drive, Files.'
              : 'DEVISERA n’envoie rien à votre place. Les fichiers sont remis à l’application que vous choisissez : Mail, Drive, Fichiers.'}
          </Caption>
        </View>
      </ScrollView>
    </Screen>
  );
}
