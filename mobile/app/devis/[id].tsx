import * as React from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  DevisiaApiError,
  FOLLOW_UP_TONE_LABELS,
  QUOTE_STATUS_LABELS,
  formatCents,
  type FollowUpTone,
  type QuoteDetailDTO,
} from '@devisia/shared';
import {
  Amount,
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
  Skeleton,
  Title,
} from '@/components/ui';
import { useToast } from '@/components/toast';
import { ouvrirPdfDevis } from '@/features/pdf';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  BROUILLON: 'neutral',
  ENVOYE: 'info',
  CONSULTE: 'accent',
  ACCEPTE: 'success',
  REFUSE: 'danger',
  MODIFICATION_DEMANDEE: 'warning',
  EXPIRE: 'neutral',
  ANNULE: 'neutral',
};

const SENDABLE = ['BROUILLON', 'ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'];
/** Statuts pour lesquels la page publique existe réellement côté serveur. */
const LIEN_PUBLIC_VISIBLE = ['ENVOYE', 'CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE', 'EXPIRE'];
const FOLLOWABLE = ['ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'];

export default function DevisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const query = useQuery<QuoteDetailDTO>(() => api.quotes.get(String(id)), [id]);
  const quote = query.data;

  const [sending, setSending] = React.useState(false);
  const [followUpOpen, setFollowUpOpen] = React.useState(false);
  const [pdfEnCours, setPdfEnCours] = React.useState(false);

  /**
   * Le PDF vient de la route authentifiée, pas de la page web publique :
   * celle-ci refuse les brouillons et renvoyait « 404 » sur un devis non
   * encore envoyé. iOS présente ensuite le document lui-même.
   */
  async function ouvrirPdf() {
    if (!quote || pdfEnCours) return;
    setPdfEnCours(true);
    try {
      await ouvrirPdfDevis(quote.id, quote.number);
    } catch (cause) {
      toast({
        title:
          cause instanceof DevisiaApiError
            ? cause.message
            : 'Le PDF n’a pas pu être préparé. Réessayez dans un instant.',
        tone: 'error',
      });
    } finally {
      setPdfEnCours(false);
    }
  }

  async function shareQuote() {
    if (!quote) return;
    try {
      // Un brouillon n'a pas de page publique : partager son lien enverrait le
      // client sur un 404. On partage alors le document lui-même.
      if (!LIEN_PUBLIC_VISIBLE.includes(quote.status)) {
        await ouvrirPdfDevis(quote.id, quote.number);
        return;
      }
      await Share.share({
        message: `Votre devis ${quote.number} — ${formatCents(quote.totalCents)} TTC\n${quote.publicUrl}`,
        url: quote.publicUrl,
        title: `Devis ${quote.number}`,
      });
    } catch {
      toast({ title: 'Partage impossible', tone: 'error' });
    }
  }

  function confirmSend() {
    if (!quote) return;
    Alert.alert(
      `Envoyer le devis ${quote.number} ?`,
      `Le client recevra le PDF et un lien pour accepter en ligne.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer', style: 'default', onPress: () => void send() },
      ],
    );
  }

  async function send() {
    if (!quote) return;
    setSending(true);
    try {
      const result = await api.quotes.send(quote.id);
      toast({ title: 'Devis envoyé', description: `Envoyé à ${result.recipient}.` });
      await query.reload();
    } catch (cause) {
      Alert.alert(
        'Envoi impossible',
        cause instanceof DevisiaApiError ? cause.message : 'Réessayez dans un instant.',
      );
    } finally {
      setSending(false);
    }
  }

  if (query.loading && !quote) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md }}>
        <Skeleton height={90} />
        <Skeleton height={160} />
        <Skeleton height={120} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.lg }}>
        <Banner tone="danger" title={query.error ?? 'Devis introuvable.'} />
        <Button title="Retour" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}
      >
        <View style={{ gap: spacing.sm }}>
          <Badge label={QUOTE_STATUS_LABELS[quote.status]} tone={TONES[quote.status] ?? 'neutral'} />
          <Title>{quote.title}</Title>
          <Muted>
            {quote.number} · {quote.customerName}
          </Muted>
          <Amount cents={quote.totalCents} size="metric" />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Card style={{ flex: 1, gap: 4, padding: spacing.md }}>
            <Caption>Consultations</Caption>
            <Body style={{ fontWeight: '700' }}>{quote.viewCount}</Body>
          </Card>
          <Card style={{ flex: 1, gap: 4, padding: spacing.md }}>
            <Caption>Envoyé</Caption>
            <Body style={{ fontWeight: '600' }}>
              {quote.sentAt ? new Date(quote.sentAt).toLocaleDateString('fr-FR') : 'Pas encore'}
            </Body>
          </Card>
        </View>

        {quote.clientMessage ? (
          <Banner tone="info" title="Message du client" description={quote.clientMessage} />
        ) : null}

        <View style={{ gap: spacing.md }}>
          {SENDABLE.includes(quote.status) ? (
            <Button
              title={quote.status === 'BROUILLON' ? 'Envoyer le devis' : 'Renvoyer le devis'}
              icon="send"
              size="lg"
              loading={sending}
              onPress={confirmSend}
              haptic
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              title="Partager"
              icon="share-outline"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => void shareQuote()}
            />
            <Button
              title="PDF"
              icon="document-outline"
              variant="secondary"
              style={{ flex: 1 }}
              loading={pdfEnCours}
              disabled={pdfEnCours}
              haptic
              onPress={() => void ouvrirPdf()}
            />
          </View>

          {FOLLOWABLE.includes(quote.status) ? (
            <Button
              title="Préparer une relance"
              icon="sparkles"
              variant="secondary"
              onPress={() => setFollowUpOpen(true)}
            />
          ) : null}
        </View>

        <Card style={{ gap: spacing.md }}>
          <Caption>Détail</Caption>
          {quote.items.map((item, index) => (
            <View key={item.id} style={{ gap: spacing.sm }}>
              {index > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600' }}>{item.label}</Body>
                  {item.description ? <Muted style={{ fontSize: 12 }}>{item.description}</Muted> : null}
                  <Muted style={{ fontSize: 12 }}>
                    {item.quantity} {item.unit} × {formatCents(item.unitPriceCents)} HT
                  </Muted>
                </View>
                <Body style={{ fontWeight: '600' }}>{formatCents(item.lineTotalCents)}</Body>
              </View>
            </View>
          ))}

          <Divider />
          <Row label="Total HT" value={formatCents(quote.subtotalCents)} />
          <Row label="TVA" value={formatCents(quote.vatCents)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Heading>Total TTC</Heading>
            <Amount cents={quote.totalCents} size="metric" tone="accent" />
          </View>
        </Card>

        {/* La page publique refuse les brouillons et les devis annulés : y
            renvoyer donnerait au client un lien mort. Le lien n'apparaît donc
            qu'une fois le devis parti. */}
        {LIEN_PUBLIC_VISIBLE.includes(quote.status) ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ouvrir le lien client"
            onPress={() => void WebBrowser.openBrowserAsync(quote.publicUrl)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.canvas,
              borderWidth: 1,
              borderColor: colors.line,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="link-outline" size={18} color={colors.subtle} />
            <Muted style={{ flex: 1 }} numberOfLines={1}>
              {quote.publicUrl}
            </Muted>
            <Muted style={{ fontSize: 12 }}>Lien client</Muted>
          </Pressable>
        ) : (
          <Muted style={{ fontSize: 13 }}>
            Le lien client sera disponible une fois le devis envoyé.
          </Muted>
        )}
      </ScrollView>

      <FollowUpSheet
        quoteId={quote.id}
        customerName={quote.customerName}
        visible={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        onSent={() => {
          setFollowUpOpen(false);
          toast({ title: 'Relance envoyée' });
          void query.reload();
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Muted>{label}</Muted>
      <Body>{value}</Body>
    </View>
  );
}

/** Rédaction et envoi d'une relance, avec choix du ton. */
function FollowUpSheet({
  quoteId,
  customerName,
  visible,
  onClose,
  onSent,
}: {
  quoteId: string;
  customerName: string;
  visible: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [tone, setTone] = React.useState<FollowUpTone>('professionnel');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (nextTone: FollowUpTone) => {
      setLoading(true);
      setError(null);
      try {
        const draft = await api.quotes.followUpDraft(quoteId, nextTone);
        setSubject(draft.objet);
        setMessage(draft.message);
      } catch (cause) {
        setError(cause instanceof DevisiaApiError ? cause.message : 'Préparation impossible.');
      } finally {
        setLoading(false);
      }
    },
    [quoteId],
  );

  async function send() {
    setSending(true);
    setError(null);
    try {
      await api.quotes.sendFollowUp(quoteId, { subject, body: message });
      onSent();
    } catch (cause) {
      setError(cause instanceof DevisiaApiError ? cause.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={() => void load(tone)}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        <View style={{ gap: 4 }}>
          <Title>Relancer {customerName}</Title>
          <Muted>Message préparé pour vous. Modifiez-le avant l’envoi.</Muted>
        </View>

        {error ? <Banner tone="danger" title={error} /> : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {(Object.keys(FOLLOW_UP_TONE_LABELS) as FollowUpTone[]).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: tone === option }}
              onPress={() => {
                setTone(option);
                void load(option);
              }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: tone === option ? colors.accent : colors.line,
                backgroundColor: tone === option ? colors.accentSoft : colors.canvas,
              }}
            >
              <Body style={{ fontSize: 13, fontWeight: '600', color: tone === option ? colors.accentHover : colors.muted }}>
                {FOLLOW_UP_TONE_LABELS[option]}
              </Body>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Card style={{ gap: spacing.md }}>
            <TextInput
              accessibilityLabel="Objet"
              value={subject}
              onChangeText={setSubject}
              style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}
              placeholder="Objet"
              placeholderTextColor={colors.subtle}
            />
            <Divider />
            <TextInput
              accessibilityLabel="Message"
              value={message}
              onChangeText={setMessage}
              multiline
              style={{ minHeight: 220, fontSize: 15, lineHeight: 22, color: colors.ink, textAlignVertical: 'top' }}
              placeholder="Message"
              placeholderTextColor={colors.subtle}
            />
          </Card>
        )}

        <View style={{ gap: spacing.md }}>
          <Button
            title="Envoyer la relance"
            size="lg"
            loading={sending}
            disabled={loading || !message.trim()}
            onPress={() => void send()}
            haptic
          />
          <Button title="Annuler" variant="ghost" onPress={onClose} />
        </View>
      </ScrollView>
    </Modal>
  );
}
