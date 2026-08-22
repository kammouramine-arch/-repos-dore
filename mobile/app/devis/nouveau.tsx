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
import { formatCents, type CustomerDTO, type GeneratedQuoteDTO } from '@devisia/shared';
import {
  Badge,
  Banner,
  Body,
  Button,
  Caption,
  Card,
  Divider,
  Heading,
  Ionicons,
  Muted,
  Title,
} from '@/components/ui';
import { useToast } from '@/components/toast';
import { useVoiceCapture } from '@/features/recorder';
import { usePhotoCapture } from '@/features/photos';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { colors, radius, shadows, spacing } from '@/theme';
import { DevisiaApiError } from '@devisia/shared';

const STEPS = [
  'Analyse du chantier',
  'Lecture des photos',
  'Recherche dans votre catalogue',
  'Préparation du devis',
  'Calcul des montants',
];

type Phase = 'saisie' | 'generation' | 'verification';

/**
 * Création de devis : l'écran central de DEVISIA mobile.
 * Le micro est le geste principal ; tout le reste est secondaire.
 */
export default function NouveauDevisScreen() {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = React.useState<Phase>('saisie');
  const [description, setDescription] = React.useState('');
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<GeneratedQuoteDTO | null>(null);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const voice = useVoiceCapture((text) =>
    setDescription((current) => (current ? `${current.trim()} ${text}` : text)),
  );
  const photos = usePhotoCapture();
  const customers = useQuery<{ total: number; items: CustomerDTO[] }>(() => api.customers.list());

  React.useEffect(() => {
    if (phase !== 'generation') return;
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 900);
    return () => clearInterval(timer);
  }, [phase]);

  async function generate() {
    if (description.trim().length < 10) {
      setError('Décrivez le chantier en quelques mots avant de continuer.');
      return;
    }
    setError(null);
    setStep(0);
    setPhase('generation');

    try {
      const result = await api.ai.generateQuote({
        description: description.trim(),
        fileIds: photos.fileIds,
      });
      setDraft(result);
      setPhase('verification');
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'Préparation impossible pour le moment.',
      );
      setPhase('saisie');
    }
  }

  async function save() {
    if (!draft) return;
    if (!customerId) {
      setError('Choisissez le client avant d’enregistrer.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const quote = await api.quotes.create({
        customerId,
        title: draft.title,
        summary: [draft.summary, ...draft.workDescription.map((task) => `• ${task}`)]
          .filter(Boolean)
          .join('\n'),
        aiGenerated: true,
        aiConfidence: draft.confidence,
        aiWarnings: draft.warnings,
        aiQuestions: draft.questions,
        items: draft.lines.map((line) => ({
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

      toast({ title: 'Devis enregistré', description: 'Vous pouvez maintenant l’envoyer au client.' });
      router.replace(`/devis/${quote.id}`);
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'Enregistrement impossible.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (phase === 'generation') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: radius.full,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="sparkles" size={32} color={colors.accent} />
        </View>
        <Heading>DEVISIA prépare votre devis</Heading>

        <View style={{ gap: spacing.md, alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
          {STEPS.map((label, index) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {index < step ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : index === step ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.line }} />
              )}
              <Body style={{ color: index <= step ? colors.ink : colors.subtle }}>{label}</Body>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (phase === 'verification' && draft) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}
      >
        <View style={{ gap: 4 }}>
          <Title>Vérifiez votre devis</Title>
          <Muted>Rien n’est envoyé sans votre validation.</Muted>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Badge label={`Confiance ${draft.confidence} %`} tone={draft.confidence >= 60 ? 'success' : 'warning'} />
          {draft.degraded ? <Badge label="Mode local" tone="neutral" /> : null}
          {draft.lines.some((line) => line.fromCatalog) ? <Badge label="Catalogue appliqué" tone="accent" /> : null}
        </View>

        {error ? <Banner tone="danger" title={error} /> : null}

        {draft.questions.length > 0 ? (
          <Banner
            tone="warning"
            title="Informations à compléter"
            description={draft.questions.join('\n')}
          />
        ) : null}

        {draft.observations.length > 0 ? (
          <Banner
            tone="info"
            title="Observé sur vos photos"
            description={draft.observations.join('\n')}
          />
        ) : null}

        {draft.assumptions.length > 0 ? (
          <Banner
            tone="warning"
            title="Hypothèses à confirmer"
            description={draft.assumptions.join('\n')}
          />
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Caption>Objet</Caption>
          <Heading>{draft.title}</Heading>
          {draft.summary ? <Muted>{draft.summary}</Muted> : null}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Caption>Client</Caption>
          {customers.loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : customers.data && customers.data.items.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {customers.data.items.slice(0, 8).map((customer) => (
                <Pressable
                  key={customer.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: customerId === customer.id }}
                  onPress={() => setCustomerId(customer.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: customerId === customer.id ? colors.accent : colors.line,
                    backgroundColor: customerId === customer.id ? colors.accentSoft : colors.canvas,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '600' }}>{customer.displayName}</Body>
                    {customer.email ? <Muted style={{ fontSize: 12 }}>{customer.email}</Muted> : null}
                  </View>
                  {customerId === customer.id ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <Muted>Aucun client enregistré. Créez-en un depuis l’onglet Clients.</Muted>
          )}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Caption>Détail</Caption>
          {draft.lines.map((line, index) => (
            <View key={`${line.label}-${index}`} style={{ gap: spacing.sm }}>
              {index > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600' }}>{line.label}</Body>
                  <Muted style={{ fontSize: 12 }}>
                    {line.quantity} {line.unit} × {formatCents(line.unitPriceCents)} HT
                  </Muted>
                </View>
                <Body style={{ fontWeight: '600' }}>
                  {formatCents(Math.round(line.quantity * line.unitPriceCents))}
                </Body>
              </View>
            </View>
          ))}

          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>Total HT</Muted>
            <Body>{formatCents(draft.totals.subtotalCents)}</Body>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>TVA</Muted>
            <Body>{formatCents(draft.totals.vatCents)}</Body>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Heading>Total TTC</Heading>
            <Body style={{ fontSize: 22, fontWeight: '700', color: colors.accent, letterSpacing: -0.6 }}>
              {formatCents(draft.totals.totalCents)}
            </Body>
          </View>
        </Card>

        <View style={{ gap: spacing.md }}>
          <Button title="Enregistrer le devis" size="lg" loading={saving} onPress={() => void save()} haptic />
          <Button
            title="Reprendre la description"
            variant="ghost"
            onPress={() => {
              setPhase('saisie');
              setDraft(null);
            }}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Title>Décrivez votre chantier</Title>
          <Muted>Parlez comme vous le feriez à votre apprenti. DEVISIA met en forme.</Muted>
        </View>

        {error ? <Banner tone="danger" title={error} /> : null}
        {voice.error ? <Banner tone="warning" title={voice.error} /> : null}
        {photos.error ? <Banner tone="warning" title={photos.error} /> : null}

        <Card style={{ gap: spacing.md }}>
          <TextInput
            accessibilityLabel="Description du chantier"
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Le client a une fuite sous l'évier. Il faut remplacer le siphon, vérifier les raccordements et prévoir environ une heure de main-d'œuvre."
            placeholderTextColor={colors.subtle}
            style={{
              minHeight: 150,
              fontSize: 16,
              lineHeight: 23,
              color: colors.ink,
              textAlignVertical: 'top',
            }}
            maxLength={8000}
          />
          <Muted style={{ fontSize: 12, textAlign: 'right' }}>{description.length} / 8000</Muted>
        </Card>

        <MicButton
          status={voice.status}
          onStart={() => void voice.start()}
          onStop={() => void voice.stop()}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            title="Photo"
            icon="camera-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => void photos.takePhoto()}
            disabled={!photos.canAdd}
          />
          <Button
            title="Galerie"
            icon="images-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => void photos.pickPhotos()}
            disabled={!photos.canAdd}
          />
        </View>

        {photos.photos.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {photos.photos.map((photo) => (
              <View key={photo.id} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surface2 }}
                  accessibilityLabel="Photo de chantier"
                />
                {photo.uploading ? (
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(10,14,20,0.35)',
                      borderRadius: radius.md,
                    }}
                  >
                    <ActivityIndicator color={colors.white} size="small" />
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retirer la photo"
                    onPress={() => photos.remove(photo.id)}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <Button
          title="Préparer le devis"
          icon="sparkles"
          size="lg"
          onPress={() => void generate()}
          haptic
        />
        <Muted style={{ textAlign: 'center', fontSize: 12 }}>
          Vous vérifierez et modifierez le devis avant tout envoi.
        </Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Gros bouton micro : le geste principal de l'application. */
function MicButton({
  status,
  onStart,
  onStop,
}: {
  status: 'inactif' | 'enregistrement' | 'transcription';
  onStart: () => void;
  onStop: () => void;
}) {
  const pulse = React.useMemo(() => new Animated.Value(1), []);

  React.useEffect(() => {
    if (status !== 'enregistrement') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 620, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, status]);

  const recording = status === 'enregistrement';
  const busy = status === 'transcription';

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Arrêter la dictée' : 'Dicter la description du chantier'}
          accessibilityState={{ busy }}
          disabled={busy}
          onPress={recording ? onStop : onStart}
          style={({ pressed }) => [
            {
              width: 92,
              height: 92,
              borderRadius: radius.full,
              backgroundColor: recording ? colors.danger : colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
            },
            shadows.floating as object,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name={recording ? 'stop' : 'mic'} size={38} color={colors.white} />
          )}
        </Pressable>
      </Animated.View>

      <Body style={{ fontWeight: '600' }}>
        {busy ? 'Transcription en cours…' : recording ? 'Appuyez pour arrêter' : 'Appuyez et décrivez'}
      </Body>
    </View>
  );
}
