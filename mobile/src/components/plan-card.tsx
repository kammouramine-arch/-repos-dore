import * as React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge, PressableCard } from './ui';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Carte de formule.
 *
 * Trois cartes identiques avec un bouton radio ne disaient pas laquelle
 * choisir ni laquelle était choisie. La carte sélectionnée s'entoure du bleu
 * de marque et porte une coche pleine ; « Recommandé » désigne la formule
 * conseillée ; le prix vient tel quel du magasin — jamais formaté ici.
 */
export function PlanCard({
  name,
  tagline,
  price,
  priceSuffix,
  note,
  highlights,
  selected,
  recommended = false,
  disabled = false,
  onPress,
  labels,
}: {
  name: string;
  tagline: string;
  /** Prix localisé fourni par le magasin (StoreKit) ou par le serveur. */
  price: string | null;
  priceSuffix: string;
  /** Mention sous le prix : essai, chargement… */
  note?: string | null;
  highlights: readonly string[];
  selected: boolean;
  recommended?: boolean;
  disabled?: boolean;
  onPress: () => void;
  labels: { selected: string; recommended: string; pricePending: string };
}) {
  return (
    <PressableCard
      haptic
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${name}${price ? `, ${price} ${priceSuffix}` : ''}`}
      onPress={onPress}
      style={{
        gap: spacing.md,
        padding: spacing.xl,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: colors.canvas,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Text style={[typography.heading, { color: colors.ink, fontSize: 20 }]}>{name}</Text>
            {recommended ? <Badge label={labels.recommended} tone="accent" /> : null}
          </View>
          <Text style={[typography.small, { color: colors.muted }]}>{tagline}</Text>
        </View>
        <View
          style={{
            width: 26,
            height: 26,
            flexShrink: 0,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? colors.accent : 'transparent',
            borderWidth: selected ? 0 : 1.5,
            borderColor: colors.lineStrong,
          }}
        >
          {selected ? <Ionicons name="checkmark" size={17} color={colors.white} /> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
        {price ? (
          <>
            <Text style={{ fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.9, color: colors.ink, fontVariant: ['tabular-nums'] }}>{price}</Text>
            <Text style={[typography.small, { color: colors.muted }]}>{priceSuffix}</Text>
          </>
        ) : (
          <Text style={[typography.small, { color: colors.muted }]}>{labels.pricePending}</Text>
        )}
      </View>
      {note ? <Text style={[typography.caption, { color: colors.accentHover, letterSpacing: 0 }]}>{note}</Text> : null}

      <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
        {highlights.map((highlight) => (
          <View key={highlight} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 9, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <Ionicons name="checkmark" size={12} color={colors.accent} />
            </View>
            <Text style={[typography.small, { flex: 1, minWidth: 0, color: colors.inkSoft, lineHeight: 19 }]}>{highlight}</Text>
          </View>
        ))}
      </View>
      {selected ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 }}>
          <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
          <Text style={[typography.small, { color: colors.accent, fontWeight: '600' }]}>{labels.selected}</Text>
        </View>
      ) : null}
    </PressableCard>
  );
}
