import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError, type CustomerDTO, type GeneratedQuoteDTO } from '@devisia/shared';
import {
  Amount,
  Badge,
  Banner,
  Body,
  Button,
  Caption,
  Card,
  ChoiceRow,
  Divider,
  GrowingInput,
  Heading,
  IconButton,
  Ionicons,
  Muted,
  ProgressDots,
  SectionHeader,
  Title,
} from '@/components/ui';
import { ClientPicker } from '@/components/client-picker';
import { useToast } from '@/components/toast';
import { useDictation } from '@/features/voice';
import { usePhotoCapture } from '@/features/photos';
import { applyAnswers, missingLabel, toQuestions, type MissingQuestion } from '@/features/missing-info';
import { api } from '@/lib/api';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/**
 * Création d'un devis — l'écran qui porte la promesse du produit.
 *
 * Le parcours suit l'ordre dans lequel un artisan pense, et non l'ordre dans
 * lequel le serveur a besoin des données : on décrit le chantier, on complète
 * ce qui manque, on désigne le client, on vérifie. Chaque étape se termine par
 * une action unique et évidente.
 */
type Phase = 'saisie' | 'questions' | 'generation' | 'verification';

/*
 * Étapes annoncées pendant la préparation. « Lecture des photos » ne s'affiche
 * que si des photos ont été jointes : cocher une étape qui n'a pas eu lieu,
 * c'est raconter du travail qui n'a pas été fait.
 */
function etapesPour(avecPhotos: boolean): string[] {
  return [
    'Analyse de votre description',
    ...(avecPhotos ? ['Lecture de vos photos'] : []),
    'Recherche dans votre catalogue',
    'Rédaction des lignes',
    'Calcul des montants',
  ];
}

function customerName(customer: CustomerDTO): string {
  const parts = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return customer.companyName?.trim() || parts || 'Client';
}

function seconds(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Les montants et quantités se modifient : le cadre le dit sans l'écrire. */
const cellInput = {
  color: colors.ink,
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radius.sm,
  backgroundColor: colors.canvas,
} as const;

/** Un seul bandeau d'erreur pour toutes les étapes de la création. */
function ErrorBanner({
  error,
  retry,
  onDismiss,
}: {
  error: string | null;
  retry: (() => void) | null;
  onDismiss: () => void;
}) {
  if (!error) return null;
  return (
    <Banner
      tone="danger"
      title={error}
      description={
        retry ? 'Votre description et vos photos sont conservées : vous pouvez relancer.' : undefined
      }
      onDismiss={onDismiss}
      action={
        retry ? (
          <Button title="Réessayer" variant="secondary" icon="refresh" onPress={retry} />
        ) : undefined
      }
    />
  );
}

export default function NouveauDevisScreen() {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = React.useState<Phase>('saisie');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  // Une panne réseau se rejoue ; une description trop courte, non. Le bandeau
  // ne propose « Réessayer » que quand réessayer a un sens, et il rejoue
  // exactement l'opération qui a échoué.
  const [retry, setRetry] = React.useState<(() => void) | null>(null);
  const [step, setStep] = React.useState(0);

  const [draft, setDraft] = React.useState<GeneratedQuoteDTO | null>(null);
  const [lines, setLines] = React.useState<GeneratedQuoteDTO['lines']>([]);
  const [title, setTitle] = React.useState('');
  const [customer, setCustomer] = React.useState<CustomerDTO | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [questions, setQuestions] = React.useState<MissingQuestion[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const dictation = useDictation(
    React.useCallback((text: string) => {
      setDescription((current) => (current.trim() ? `${current.trim()} ${text}` : text));
    }, []),
  );
  const photos = usePhotoCapture();
  const etapes = React.useMemo(() => etapesPour(photos.fileIds.length > 0), [photos.fileIds.length]);

  // Progression de la génération : une barre qui avance vaut mieux qu'un écran figé.
  React.useEffect(() => {
    if (phase !== 'generation') return undefined;
    const timer = setInterval(() => setStep((c) => Math.min(c + 1, etapes.length - 1)), 850);
    return () => clearInterval(timer);
  }, [phase, etapes.length]);

  const pulse = React.useMemo(() => new Animated.Value(1), []);
  React.useEffect(() => {
    if (dictation.status !== 'ecoute') {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 620, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dictation.status, pulse]);

  const listening = dictation.status === 'ecoute';
  const busy = dictation.status === 'demande' || dictation.status === 'traitement';
  const composed = `${description}${dictation.partial ? ` ${dictation.partial}` : ''}`.trim();

  async function generate(text: string) {
    setError(null);
    setRetry(null);
    setStep(0);
    setPhase('generation');
    try {
      const result = await api.ai.generateQuote({
        description: text.trim(),
        fileIds: photos.fileIds,
      });
      setDraft(result);
      setLines(result.lines);
      setTitle(result.title);
      setPhase('verification');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (cause) {
      setRetry(() => () => void generate(text));
      setError(
        cause instanceof DevisiaApiError
          ? cause.message
          : 'La préparation du devis n’a pas abouti.',
      );
      // On revient là d'où l'artisan est parti : ses réponses restent saisies.
      setPhase(questions.length > 0 ? 'questions' : 'saisie');
    }
  }

  /** Première passe : on demande d'abord ce qui manque, avant de faire attendre. */
  async function prepare() {
    if (composed.trim().length < 12) {
      setRetry(null);
      setError('Décrivez le chantier en quelques mots avant de continuer.');
      return;
    }
    if (photos.uploading) {
      setRetry(null);
      setError('Une photo est en cours d’envoi. Encore un instant.');
      return;
    }
    setError(null);
    setRetry(null);
    setStep(0);
    setPhase('generation');
    try {
      const first = await api.ai.generateQuote({
        description: composed.trim(),
        fileIds: photos.fileIds,
      });
      const missing = toQuestions(first);
      if (missing.length > 0) {
        setDraft(first);
        setQuestions(missing);
        setAnswers({});
        setPhase('questions');
        return;
      }
      setDraft(first);
      setLines(first.lines);
      setTitle(first.title);
      setPhase('verification');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (cause) {
      setRetry(() => () => void prepare());
      setError(
        cause instanceof DevisiaApiError
          ? cause.message
          : 'La préparation du devis n’a pas abouti.',
      );
      setPhase('saisie');
    }
  }

  async function save() {
    if (!draft) return;
    if (!customer) {
      setPickerOpen(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const quote = await api.quotes.create({
        customerId: customer.id,
        title: title.trim() || draft.title,
        summary: [draft.summary, ...draft.workDescription.map((task) => `• ${task}`)]
          .filter(Boolean)
          .join('\n'),
        aiGenerated: true,
        aiConfidence: draft.confidence,
        aiWarnings: draft.warnings,
        aiQuestions: draft.questions,
        items: lines.map((line) => ({
          kind: line.kind,
          label: line.label,
          description: line.description,
          unit: line.unit,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          discountRate: line.discountRate,
          vatRate: line.vatRate,
          priceBookItemId: line.priceBookItemId,
        })),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: 'Devis enregistré', description: 'Vous pouvez le relire puis l’envoyer.' });
      router.replace(`/devis/${quote.id}`);
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'L’enregistrement n’a pas abouti.',
      );
    } finally {
      setSaving(false);
    }
  }

  function patchLine(index: number, next: Partial<GeneratedQuoteDTO['lines'][number]>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...next } : line)));
  }

  const totals = React.useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + Math.round(line.unitPriceCents * line.quantity * (1 - line.discountRate / 100)),
      0,
    );
    const vat = lines.reduce(
      (sum, line) =>
        sum +
        Math.round(
          line.unitPriceCents * line.quantity * (1 - line.discountRate / 100) * (line.vatRate / 100),
        ),
      0,
    );
    return { subtotal, vat, total: subtotal + vat };
  }, [lines]);

  /* ---------------------------------------------------------------- Génération */
  if (phase === 'generation') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.xl,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="sparkles" size={30} color={colors.accent} />
        </View>
        <Heading>DEVISIA prépare votre devis</Heading>
        <View style={{ gap: spacing.md, alignSelf: 'stretch', paddingHorizontal: spacing.lg }}>
          {etapes.map((label, index) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {index < step ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : index === step ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                />
              )}
              <Body style={{ color: index <= step ? colors.ink : colors.subtle }}>{label}</Body>
            </View>
          ))}
        </View>
      </View>
    );
  }

  /* ----------------------------------------------------- Informations manquantes */
  if (phase === 'questions') {
    const answered = questions.filter((q) => answers[q.id]?.trim()).length;
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing['4xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: spacing.sm }}>
            <ProgressDots total={questions.length} current={Math.min(answered, questions.length - 1)} />
            <Title>{missingLabel(questions.length)}</Title>
            <Muted>Une précision de votre part vaut mieux qu’une estimation de ma part.</Muted>
          </View>

          {questions.map((question) => (
            <Card key={question.id} style={{ gap: spacing.md }}>
              <Body style={{ fontWeight: '600' }}>{question.prompt}</Body>
              {question.choices ? (
                <ChoiceRow
                  options={question.choices}
                  value={answers[question.id] ?? null}
                  onChange={(value) => setAnswers((a) => ({ ...a, [question.id]: value }))}
                />
              ) : null}
              {question.choices && !answers[question.id] ? null : (
              <TextInput
                value={answers[question.id] ?? ''}
                onChangeText={(value) => setAnswers((a) => ({ ...a, [question.id]: value }))}
                placeholder={question.placeholder ?? 'Précisez si besoin'}
                placeholderTextColor={colors.subtle}
                accessibilityLabel={question.prompt}
                multiline={question.kind !== 'duree'}
                style={[
                  typography.body,
                  {
                    color: colors.ink,
                    minHeight: question.kind === 'duree' ? 46 : 72,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    textAlignVertical: 'top',
                  },
                ]}
              />
              )}
            </Card>
          ))}

          <ErrorBanner error={error} retry={retry} onDismiss={() => setError(null)} />

          <View style={{ gap: spacing.sm }}>
            <Button
              title="Préparer le devis"
              icon="sparkles"
              haptic
              onPress={() => void generate(applyAnswers(composed, questions, answers))}
            />
            <Button
              title="Préparer sans ces précisions"
              variant="ghost"
              onPress={() => void generate(composed)}
            />
          </View>
          <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
            Sans réponse, j’estimerai — et je le signalerai sur le devis.
          </Caption>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* -------------------------------------------------------------- Vérification */
  if (phase === 'verification' && draft) {
    return (
      <>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.surface }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 4 }}>
            <Title>Vérifiez votre devis</Title>
            <Muted>Rien n’est envoyé sans votre validation.</Muted>
          </View>

          {error ? <Banner tone="danger" title={error} /> : null}

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title="Objet" />
            {/* Multiligne : un objet de devis dépasse souvent la largeur d'un
                iPhone, et un champ à une seule ligne le rognait. */}
            <GrowingInput
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Objet du devis"
              placeholder="Remplacement du siphon"
              placeholderTextColor={colors.subtle}
              minHeight={30}
              style={[typography.heading, { color: colors.ink, width: '100%' }]}
            />
            {draft.summary ? <Muted>{draft.summary}</Muted> : null}
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title="Client" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={customer ? 'Changer de client' : 'Choisir le client'}
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  backgroundColor: customer ? colors.accentSoft : colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={customer ? 'person' : 'person-add-outline'}
                  size={19}
                  color={customer ? colors.accent : colors.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '600' }}>
                  {customer ? customerName(customer) : 'Choisir ou créer le client'}
                </Body>
                <Muted style={{ fontSize: 13 }}>
                  {customer
                    ? customer.email ?? customer.phone ?? 'Fiche client'
                    : 'Nécessaire pour enregistrer'}
                </Muted>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
          </Card>

          <Card style={{ gap: spacing.md, padding: 0, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
              <SectionHeader
                title="Détail"
                action={{
                  label: '+ Ligne',
                  onPress: () => {
                    void Haptics.selectionAsync();
                    setLines((current) => [
                      ...current,
                      {
                        kind: 'MAIN_OEUVRE',
                        label: 'Nouvelle ligne',
                        description: null,
                        unit: 'u',
                        quantity: 1,
                        unitPriceCents: 0,
                        discountRate: 0,
                        vatRate: current[0]?.vatRate ?? 20,
                        priceBookItemId: null,
                        fromCatalog: false,
                      },
                    ]);
                  },
                }}
              />
            </View>

            {lines.map((line, index) => (
              <View key={`${line.label}-${index}`} style={{ gap: spacing.sm, padding: spacing.lg }}>
                {index > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <GrowingInput
                    value={line.label}
                    onChangeText={(label) => patchLine(index, { label })}
                    accessibilityLabel={`Libellé de la ligne ${index + 1}`}
                    minHeight={22}
                    style={[
                      typography.body,
                      { flex: 1, minWidth: 0, fontWeight: '600', color: colors.ink },
                    ]}
                  />
                  <IconButton
                    icon="trash-outline"
                    label={`Supprimer la ligne ${index + 1}`}
                    tone="danger"
                    size={17}
                    onPress={() => setLines((c) => c.filter((_, i) => i !== index))}
                  />
                </View>
                {/* minWidth: 0 sur les colonnes souples : sans lui, la largeur
                    intrinsèque des champs pousse le total hors de la carte. */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Caption style={{ color: colors.subtle }} upper>
                      Quantité
                    </Caption>
                    <TextInput
                      value={String(line.quantity)}
                      onChangeText={(value) =>
                        patchLine(index, { quantity: Number(value.replace(',', '.')) || 0 })
                      }
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Quantité de la ligne ${index + 1}`}
                      style={[typography.body, cellInput]}
                    />
                  </View>
                  <View style={{ flex: 1.2, minWidth: 0, gap: 4 }}>
                    <Caption style={{ color: colors.subtle }} upper>
                      Prix unitaire
                    </Caption>
                    <TextInput
                      value={(line.unitPriceCents / 100).toFixed(2)}
                      onChangeText={(value) =>
                        patchLine(index, {
                          unitPriceCents: Math.round((Number(value.replace(',', '.')) || 0) * 100),
                        })
                      }
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Prix unitaire de la ligne ${index + 1}`}
                      style={[typography.body, cellInput]}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 4 }}>
                    <Caption style={{ color: colors.subtle }} upper>
                      Total
                    </Caption>
                    <View style={{ paddingVertical: 8 }}>
                      <Amount cents={Math.round(line.unitPriceCents * line.quantity)} />
                    </View>
                  </View>
                </View>
                {line.fromCatalog ? <Badge label="Votre catalogue" tone="accent" /> : null}
              </View>
            ))}
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>Total HT</Muted>
              <Amount cents={totals.subtotal} tone="muted" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>TVA</Muted>
              <Amount cents={totals.vat} tone="muted" />
            </View>
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Body style={{ fontWeight: '600' }}>Total TTC</Body>
              <Amount cents={totals.total} size="metric" />
            </View>
          </Card>

          {draft.assumptions.length > 0 ? (
            <Banner
              tone="info"
              title="J’ai estimé, à confirmer"
              description={draft.assumptions.join('\n')}
            />
          ) : null}
        </ScrollView>

        <View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: spacing.lg,
              paddingBottom: spacing['2xl'],
              backgroundColor: colors.canvas,
              borderTopWidth: 1,
              borderTopColor: colors.line,
            },
            shadows.floating as object,
          ]}
        >
          <Button
            title={customer ? 'Enregistrer le devis' : 'Choisir le client'}
            icon={customer ? 'checkmark' : 'person-add-outline'}
            loading={saving}
            haptic
            onPress={() => void save()}
          />
        </View>

        <ClientPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(next) => {
            setCustomer(next);
            setPickerOpen(false);
          }}
        />
      </>
    );
  }

  /* -------------------------------------------------------------------- Saisie */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Title>Décrivez votre chantier</Title>
          <Muted>Parlez comme vous le feriez à votre apprenti. DEVISIA met en forme.</Muted>
        </View>

        <ErrorBanner error={error} retry={retry} onDismiss={() => setError(null)} />
        {dictation.error ? (
          <Banner
            tone="warning"
            title={dictation.error}
            onDismiss={dictation.dismissError}
          />
        ) : null}
        {photos.permissionNotice ? (
          <Banner
            tone="warning"
            title={photos.permissionNotice}
            onDismiss={photos.dismissNotice}
          />
        ) : null}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <TextInput
            value={composed}
            onChangeText={(text) => {
              if (!listening) setDescription(text);
            }}
            editable={!listening}
            multiline
            maxLength={8000}
            accessibilityLabel="Description du chantier"
            placeholder="Le client a une fuite sous l’évier. Remplacer le siphon, vérifier les raccordements, environ une heure sur place."
            placeholderTextColor={colors.subtle}
            style={[
              typography.body,
              { color: colors.ink, minHeight: 168, padding: spacing.lg, textAlignVertical: 'top' },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            ]}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
            }}
          >
            {listening ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger }} />
                <Caption style={{ color: colors.danger }}>{seconds(dictation.elapsedMs)}</Caption>
              </View>
            ) : (
              <Caption style={{ color: colors.subtle }}>
                {dictation.onDevice ? 'Dictée sans réseau' : ''}
              </Caption>
            )}
            <Caption style={{ color: colors.subtle }}>{composed.length} / 8000</Caption>
          </View>
        </Card>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Arrêter la dictée' : 'Dicter la description'}
              accessibilityState={{ disabled: !dictation.supported || busy }}
              disabled={!dictation.supported || busy}
              onPress={() => (listening ? dictation.stop() : void dictation.start())}
              style={({ pressed }) => [
                {
                  width: 88,
                  height: 88,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: listening ? colors.danger : colors.accent,
                  opacity: !dictation.supported ? 0.4 : pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
                shadows.floating as object,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Ionicons name={listening ? 'stop' : 'mic'} size={34} color={colors.white} />
              )}
            </Pressable>
          </Animated.View>
          <Body style={{ color: colors.muted }}>
            {!dictation.supported
              ? 'Dictée indisponible ici — écrivez la description'
              : listening
                ? 'Appuyez pour arrêter'
                : busy
                  ? 'Un instant…'
                  : 'Appuyez et décrivez le chantier'}
          </Body>
        </View>

        {photos.photos.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader title={`Photos (${photos.photos.length}/6)`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {photos.photos.map((photo) => (
                <View key={photo.localId} style={{ width: 104, gap: 6 }}>
                  <View
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: radius.lg,
                      overflow: 'hidden',
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} />
                    {photo.status !== 'pret' ? (
                      <View
                        style={{
                          ...StyleSheetAbsolute,
                          backgroundColor: 'rgba(10,14,20,0.45)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {photo.status === 'envoi' ? (
                          <ActivityIndicator color={colors.white} />
                        ) : (
                          <Ionicons name="alert-circle" size={26} color={colors.white} />
                        )}
                      </View>
                    ) : null}
                    <View style={{ position: 'absolute', top: 2, right: 2 }}>
                      <IconButton
                        icon="close-circle"
                        label="Retirer cette photo"
                        size={20}
                        onPress={() => photos.remove(photo.localId)}
                      />
                    </View>
                  </View>
                  {photo.status === 'echec' ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => photos.retry(photo.localId)}
                      hitSlop={6}
                    >
                      <Caption style={{ color: colors.accent }}>Renvoyer</Caption>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
            {photos.failed.length > 0 ? (
              <Muted style={{ fontSize: 13 }}>{photos.failed[0].error}</Muted>
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Photo"
              variant="secondary"
              icon="camera-outline"
              disabled={!photos.canAdd}
              onPress={() => void photos.takePhoto()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Galerie"
              variant="secondary"
              icon="images-outline"
              disabled={!photos.canAdd}
              onPress={() => void photos.pickPhotos()}
            />
          </View>
        </View>

        <Button
          title="Préparer le devis"
          icon="sparkles"
          haptic
          loading={photos.uploading}
          onPress={() => void prepare()}
        />
        <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
          Vous vérifierez et modifierez le devis avant tout envoi.
        </Caption>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Recouvrement d'une vignette — extrait pour éviter un objet recréé à chaque rendu. */
const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
