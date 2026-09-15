import * as React from 'react';
import { Animated, FlatList, Pressable, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { QUOTE_STATUS_LABELS, formatCents, type QuoteSummaryDTO } from '@devisia/shared';
import { Badge, Button, Caption, Muted, SectionHeader, Skeleton } from './ui';
import { Enter, useReducedMotion, useTouchMotion } from './motion';
import { localizeText, useMobileLocale } from '@/lib/i18n';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/**
 * « Vos devis » : un carrousel horizontal, une carte dominante et l'amorce de
 * la suivante, accrochage naturel, points de page. Les données sont celles de
 * l'API ; aucun montant n'est inventé. La carte s'ouvre d'un geste ; le
 * défilement reste libre et n'est jamais bloqué par une animation.
 */
const GAP = spacing.md;
const PEEK = 36;
const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'info'> = {
  BROUILLON: 'neutral', ENVOYE: 'accent', CONSULTE: 'info', ACCEPTE: 'success', REFUSE: 'warning', MODIFICATION_DEMANDEE: 'warning', EXPIRE: 'neutral', ANNULE: 'neutral',
};

export function QuoteCarousel({ quotes, loading, en, onBrand = false }: { quotes: QuoteSummaryDTO[] | undefined; loading: boolean; en: boolean; /** Posé sur la surface bleue de l'accueil : en-tête en blanc. */ onBrand?: boolean }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(240, width - spacing.xl * 2 - PEEK);
  const [page, setPage] = React.useState(0);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + GAP));
    if (next !== page) setPage(next);
  };
  const items = quotes ?? [];
  return (
    <View style={{ gap: spacing.md }}>
      {onBrand ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: 1.1 }]}>{en ? 'Your quotes' : 'Vos devis'}</Text>
          {items.length ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/devis')}>
              <Text style={[typography.small, { color: colors.white, fontWeight: '600' }]}>{en ? 'See all' : 'Tout voir'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <SectionHeader title={en ? 'Your quotes' : 'Vos devis'} action={items.length ? { label: en ? 'See all' : 'Tout voir', onPress: () => router.push('/devis') } : undefined} />
      )}
      {loading && !quotes ? (
        <View style={{ flexDirection: 'row', gap: GAP }}>
          <Skeleton height={150} width={cardWidth} style={{ borderRadius: radius.xl }} />
          <Skeleton height={150} width={PEEK * 2} style={{ borderRadius: radius.xl }} />
        </View>
      ) : items.length === 0 ? (
        <EmptyQuotes en={en} onCreate={() => router.push('/devis/nouveau')} />
      ) : (
        <>
          <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={onScroll}
            scrollEventThrottle={32}
            contentContainerStyle={{ gap: GAP, paddingRight: PEEK }}
            // Le carrousel vit dans un défilement vertical : ses bords ne
            // doivent pas rogner l'ombre des cartes.
            style={{ marginHorizontal: -spacing.xs, paddingHorizontal: spacing.xs, overflow: 'visible' }}
            renderItem={({ item, index }) => (
              <Enter delay={Math.min(index, 3) * 60} distance={8}>
                <QuoteCard quote={item} width={cardWidth} en={en} onPress={() => router.push(`/devis/${item.id}`)} />
              </Enter>
            )}
          />
          {items.length > 1 ? <PageDots count={items.length} active={page} /> : null}
        </>
      )}
    </View>
  );
}

function QuoteCard({ quote, width, en, onPress }: { quote: QuoteSummaryDTO; width: number; en: boolean; onPress: () => void }) {
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.975);
  const label = QUOTE_STATUS_LABELS[quote.status] ?? quote.status;
  const when = new Date(quote.sentAt ?? quote.createdAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' });
  return (
    <Animated.View style={{ width, transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${quote.customerName}, ${formatCents(quote.totalCents)}, ${localizeText(locale, label)}`}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => { touch.pressOut(); onPress(); }}
        style={{
          borderRadius: radius.xl,
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.line,
          padding: spacing.lg,
          gap: spacing.md,
          minHeight: 150,
          overflow: 'hidden',
          ...(shadows.card as object),
        }}
      >
        <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accentSoft, right: -40, top: -50, opacity: 0.7 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Badge label={label} tone={TONES[quote.status] ?? 'neutral'} />
          <Caption style={{ color: colors.subtle }}>{quote.sentAt ? (en ? `Sent ${when}` : `Envoyé le ${when}`) : (en ? `Created ${when}` : `Créé le ${when}`)}</Caption>
        </View>
        <View style={{ gap: 2 }}>
          <Text numberOfLines={1} style={[typography.heading, { color: colors.ink }]}>{quote.customerName}</Text>
          <Muted numberOfLines={1}>{quote.title}</Muted>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={[typography.metric, { color: colors.ink, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }]}>{formatCents(quote.totalCents)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[typography.small, { color: colors.accent, fontWeight: '600' }]}>{en ? 'Open' : 'Ouvrir'}</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.accent} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PageDots({ count, active }: { count: number; active: number }) {
  const reduced = useReducedMotion();
  const dots = Math.min(count, 8);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityLabel={`${active + 1} / ${count}`}>
      {Array.from({ length: dots }, (_, index) => <Dot key={index} active={index === Math.min(active, dots - 1)} reduced={reduced} />)}
    </View>
  );
}

function Dot({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [progress] = React.useState(() => new Animated.Value(active ? 1 : 0));
  React.useEffect(() => {
    if (reduced) { progress.setValue(active ? 1 : 0); return undefined; }
    const animation = Animated.spring(progress, { toValue: active ? 1 : 0, damping: 18, stiffness: 260, mass: 0.6, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [active, progress, reduced]);
  return (
    <Animated.View style={{ height: 6, borderRadius: 3, width: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }), backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [colors.lineStrong, colors.accent] }) }} />
  );
}

function EmptyQuotes({ en, onCreate }: { en: boolean; onCreate: () => void }) {
  return (
    <Enter distance={8}>
      <View style={{ borderRadius: radius.xl, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.accentBorder, padding: spacing.xl, gap: spacing.md, alignItems: 'center', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.accentSoft, right: -60, top: -70, opacity: 0.8 }} />
        <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="document-text-outline" size={24} color={colors.accent} />
        </View>
        <Text style={[typography.heading, { color: colors.ink, textAlign: 'center' }]}>{en ? 'Your quotes will live here' : 'Vos devis vivront ici'}</Text>
        <Muted style={{ textAlign: 'center' }}>{en ? 'Describe a job, DEVISERA prepares the lines. The first one takes a minute.' : 'Décrivez un chantier, DEVISERA prépare les lignes. Le premier prend une minute.'}</Muted>
        <Button title={en ? 'Create a quote' : 'Créer un devis'} icon="sparkles" haptic onPress={onCreate} />
      </View>
    </Enter>
  );
}
