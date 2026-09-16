import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  formatCents,
  type ExpenseCategoryId,
  type ExpenseListDTO,
  type ReceiptExtractionDTO,
} from '@devisia/shared';
import { Body, Button, Caption, Card, Divider, ErrorState, Screen, SectionHeader, Skeleton, Title } from '@/components/ui';
import { AuthField } from '@/components/auth-kit';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { useMobileLocale } from '@/lib/i18n';
import { useToast } from '@/components/toast';
import { useAiConsent } from '@/lib/ai-consent';
import { usePhotoCapture } from '@/features/photos';
import { colors, radius, spacing } from '@/theme';

/**
 * Dépenses et justificatifs.
 *
 * L'artisan photographie un ticket ; l'IA propose ce qu'elle a lu ; l'artisan
 * corrige et enregistre. Rien n'est écrit sans sa relecture, et les champs que
 * l'IA n'a pas su lire sont signalés au lieu d'être remplis au hasard — une
 * TVA inventée qui part en comptabilité coûte bien plus qu'un champ vide.
 */

function centsToInput(cents: number | null): string {
  return cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

function inputToCents(value: string): number | null {
  const normalised = value.replace(/\s/g, '').replace(',', '.');
  if (!normalised) return null;
  const parsed = Number.parseFloat(normalised);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export default function DepensesScreen() {
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const aiConsent = useAiConsent();
  const photos = usePhotoCapture();

  const query = useQuery<ExpenseListDTO>(() => api.expenses.list({ take: 200 }), [], 'expenses:list');

  const [reading, setReading] = React.useState(false);
  const [draft, setDraft] = React.useState<{
    merchant: string;
    amount: string;
    vat: string;
    spentAt: string;
    category: ExpenseCategoryId;
    reference: string;
    fileId: string | null;
    parsed: ReceiptExtractionDTO | null;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const submitting = React.useRef(false);
  const readFor = React.useRef<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const readyFileId = photos.fileIds[0] ?? null;

  /*
   * Un justificatif vient d'être téléversé : on le fait lire une seule fois.
   * La lecture ne crée rien ; elle remplit le formulaire de relecture.
   */
  React.useEffect(() => {
    if (!readyFileId || readFor.current === readyFileId || draft) return;
    readFor.current = readyFileId;
    setReading(true);
    void aiConsent
      .ensure()
      .then((granted) => (granted ? api.expenses.readReceipt(readyFileId) : null))
      .then((parsed) => {
        if (!parsed) return;
        setDraft({
          merchant: parsed.merchant ?? '',
          amount: centsToInput(parsed.amountCents),
          vat: centsToInput(parsed.vatCents),
          spentAt: (parsed.spentAt ?? new Date().toISOString()).slice(0, 10),
          category: parsed.category ?? 'MATERIAUX',
          reference: parsed.reference ?? '',
          fileId: readyFileId,
          parsed,
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      })
      .catch((cause: unknown) => {
        // La lecture peut échouer ; la saisie manuelle doit rester possible.
        setDraft({
          merchant: '',
          amount: '',
          vat: '',
          spentAt: new Date().toISOString().slice(0, 10),
          category: 'MATERIAUX',
          reference: '',
          fileId: readyFileId,
          parsed: null,
        });
        toast({
          title:
            cause instanceof Error
            ? cause.message
            : en
              ? 'The receipt could not be read. Enter the details yourself.'
              : 'Le justificatif n’a pas pu être lu. Saisissez les informations.',
        });
      })
      .finally(() => setReading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyFileId]);

  async function save() {
    if (submitting.current || !draft) return;
    const amountCents = inputToCents(draft.amount);
    if (!amountCents) {
      toast({ title: en ? 'Enter the amount paid.' : 'Indiquez le montant payé.' });
      return;
    }
    if (draft.merchant.trim().length < 2) {
      toast({ title: en ? 'Enter the merchant name.' : 'Indiquez le nom du commerce.' });
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await api.expenses.create({
        merchant: draft.merchant.trim(),
        category: draft.category,
        spentAt: new Date(draft.spentAt).toISOString(),
        amountCents,
        vatCents: inputToCents(draft.vat) ?? 0,
        reference: draft.reference.trim() || undefined,
        receiptFileId: draft.fileId,
        parsed: draft.parsed,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast({ title: en ? 'Expense saved.' : 'Dépense enregistrée.' });
      setDraft(null);
      readFor.current = null;
      photos.photos.forEach((photo) => photos.remove(photo.localId));
      void query.refresh({ force: true });
    } catch (cause) {
      toast({
        title:
          cause instanceof Error
          ? cause.message
          : en
            ? 'The expense could not be saved.'
            : 'La dépense n’a pas pu être enregistrée.',
      });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const data = query.data;

  if (query.loading && !data) {
    return (
      <Screen>
        <Card style={{ gap: spacing.md }}>
          <Skeleton height={14} width="40%" />
          <Skeleton height={30} width="60%" />
        </Card>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorState
          description={query.error ?? (en ? 'Your expenses could not be loaded.' : 'Vos dépenses n’ont pas pu être chargées.')}
          onRetry={() => void query.reload()}
        />
      </Screen>
    );
  }

  // Formulaire de relecture : c'est ici que l'artisan valide ce que l'IA a lu.
  if (draft) {
    const missing = draft.parsed?.missing ?? [];
    return (
      <Screen>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['3xl'] }}>
          <Title style={{ fontSize: 22 }}>{en ? 'Check the receipt' : 'Vérifiez le justificatif'}</Title>

          {draft.parsed ? (
            <Card
              style={{
                backgroundColor: missing.length > 0 ? colors.warningSoft : colors.successSoft,
                borderColor: missing.length > 0 ? colors.warningSoft : colors.successSoft,
                gap: 4,
              }}
            >
              <Body style={{ color: missing.length > 0 ? colors.warning : colors.success, fontWeight: '600' }}>
                {missing.length > 0
                  ? en
                    ? 'Some fields could not be read'
                    : 'Certains champs n’ont pas pu être lus'
                  : en
                    ? 'Receipt read'
                    : 'Justificatif lu'}
              </Body>
              <Caption style={{ color: missing.length > 0 ? colors.warning : colors.success, lineHeight: 17 }}>
                {missing.length > 0
                  ? en
                    ? `Please complete: ${missing.join(', ')}.`
                    : `À compléter : ${missing.join(', ')}.`
                  : en
                    ? 'Check the values below, then save.'
                    : 'Vérifiez les valeurs ci-dessous, puis enregistrez.'}
              </Caption>
            </Card>
          ) : null}

          <AuthField
            label={en ? 'Merchant' : 'Commerce'}
            value={draft.merchant}
            onChangeText={(value) => setDraft({ ...draft, merchant: value })}
            placeholder="Point P"
            editable={!saving}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <AuthField
                label={en ? 'Total paid' : 'Total payé'}
                value={draft.amount}
                onChangeText={(value) => setDraft({ ...draft, amount: value })}
                keyboardType="decimal-pad"
                placeholder="0,00"
                editable={!saving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AuthField
                label={en ? 'VAT' : 'TVA'}
                hint={en ? 'if printed' : 'si imprimée'}
                value={draft.vat}
                onChangeText={(value) => setDraft({ ...draft, vat: value })}
                keyboardType="decimal-pad"
                placeholder="0,00"
                editable={!saving}
              />
            </View>
          </View>
          <AuthField
            label={en ? 'Date' : 'Date'}
            value={draft.spentAt}
            onChangeText={(value) => setDraft({ ...draft, spentAt: value })}
            placeholder="2026-09-16"
            editable={!saving}
          />

          {/*
            La devise, dite plutôt que devinée.

            DEVISERA tient ses comptes en euros. Quand le ticket porte une
            autre devise, on le signale au lieu d'enregistrer un montant
            converti en silence : une conversion inventée se retrouverait en
            comptabilité sans que personne ne l'ait décidée.
          */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons
              name={draft.parsed?.currency && draft.parsed.currency !== 'EUR' ? 'alert-circle-outline' : 'cash-outline'}
              size={17}
              color={draft.parsed?.currency && draft.parsed.currency !== 'EUR' ? colors.warning : colors.subtle}
            />
            <Caption style={{ flex: 1, color: draft.parsed?.currency && draft.parsed.currency !== 'EUR' ? colors.warning : colors.subtle, lineHeight: 17 }}>
              {draft.parsed?.currency && draft.parsed.currency !== 'EUR'
                ? (en
                  ? `Receipt read in ${draft.parsed.currency}. Enter the amount in euros — nothing is converted for you.`
                  : `Reçu lu en ${draft.parsed.currency}. Saisissez le montant en euros : aucune conversion n’est faite à votre place.`)
                : (en ? 'Amounts recorded in euros (EUR).' : 'Montants enregistrés en euros (EUR).')}
            </Caption>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Caption upper style={{ color: colors.subtle }}>
              {en ? 'Category' : 'Poste de dépense'}
            </Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {EXPENSE_CATEGORY_ORDER.map((category) => {
                const selected = draft.category === category;
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={saving}
                    onPress={() => {
                      void Haptics.selectionAsync().catch(() => undefined);
                      setDraft({ ...draft, category });
                    }}
                    style={{
                      paddingHorizontal: 14,
                      height: 38,
                      justifyContent: 'center',
                      borderRadius: radius.full,
                      backgroundColor: selected ? colors.accent : colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.white : colors.inkSoft }}>
                      {EXPENSE_CATEGORY_LABELS[category]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button title={en ? 'Save the expense' : 'Enregistrer la dépense'} haptic loading={saving} onPress={() => void save()} />
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => {
              setDraft(null);
              readFor.current = null;
              photos.photos.forEach((photo) => photos.remove(photo.localId));
            }}
            style={{ alignSelf: 'center' }}
            hitSlop={8}
          >
            <Caption style={{ color: colors.muted, fontWeight: '600' }}>{en ? 'Cancel' : 'Annuler'}</Caption>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh({ force: true })} />}>
      {/* Le geste principal : photographier un ticket. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={en ? 'Photograph a receipt' : 'Photographier un justificatif'}
        disabled={reading}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          void photos.takePhoto();
        }}
        style={({ pressed }) => ({
          backgroundColor: colors.accentDeep,
          borderRadius: radius.xl,
          padding: spacing.xl,
          gap: spacing.md,
          opacity: pressed || reading ? 0.85 : 1,
        })}
      >
        <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={reading ? 'hourglass-outline' : 'camera'} size={24} color={colors.white} />
        </View>
        <Title style={{ color: colors.white, fontSize: 22 }}>
          {reading ? (en ? 'Reading the receipt…' : 'Lecture du reçu…') : en ? 'Scan a receipt' : 'Scanner un reçu'}
        </Title>
        <Body style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 21 }}>
          {en
            ? 'Take a photo. DEVISERA reads the merchant, date, total and VAT. You check before saving.'
            : 'Prenez la photo. DEVISERA lit le commerce, la date, le total et la TVA. Vous vérifiez avant d’enregistrer.'}
        </Body>
      </Pressable>

      {/*
        L'import depuis la photothèque.

        Un ticket photographié le matin sur le chantier, et classé le soir à
        l'atelier : sans cette entrée il fallait le reprendre en photo depuis
        l'écran, ce qui n'a aucun sens une fois le ticket jeté.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={en ? 'Import a receipt from your photos' : 'Importer un reçu depuis la photothèque'}
        disabled={reading}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => undefined);
          void photos.pickPhotos();
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          minHeight: 48,
          borderRadius: radius.lg,
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.line,
          opacity: pressed || reading ? 0.7 : 1,
        })}
      >
        <Ionicons name="images-outline" size={19} color={colors.accent} />
        <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.accent }}>
          {en ? 'Import from my photos' : 'Importer depuis mes photos'}
        </Text>
      </Pressable>

      {photos.permissionNotice ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft, gap: spacing.sm }}>
          <Body style={{ color: colors.warning }}>{photos.permissionNotice}</Body>
          <Pressable accessibilityRole="button" onPress={photos.dismissNotice} hitSlop={8}>
            <Caption style={{ color: colors.warning, fontWeight: '700' }}>{en ? 'OK' : 'J’ai compris'}</Caption>
          </Pressable>
        </Card>
      ) : null}

      <Card style={{ gap: 4 }}>
        <Caption upper style={{ color: colors.subtle }}>
          {en ? 'Expenses recorded' : 'Dépenses enregistrées'}
        </Caption>
        <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1.1, color: colors.ink }}>
          {formatCents(data.totalCents)}
        </Text>
        <Caption style={{ color: colors.subtle }}>
          {en
            ? `${data.count} receipt${data.count === 1 ? '' : 's'} · ${formatCents(data.vatCents)} VAT`
            : `${data.count} justificatif${data.count === 1 ? '' : 's'} · ${formatCents(data.vatCents)} de TVA`}
        </Caption>
      </Card>

      {data.expenses.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={en ? 'Recent' : 'Récentes'} />
          {data.expenses.slice(0, 25).map((expense, index) => (
            <View key={expense.id} style={{ gap: spacing.md }}>
              {index > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Body numberOfLines={1} style={{ fontWeight: '600' }}>
                    {expense.merchant}
                  </Body>
                  <Caption style={{ color: colors.subtle }} numberOfLines={1}>
                    {EXPENSE_CATEGORY_LABELS[expense.category]} · {expense.spentAt.slice(0, 10)}
                  </Caption>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
                  {formatCents(expense.amountCents)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
