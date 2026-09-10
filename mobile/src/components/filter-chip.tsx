import * as React from 'react';
import { Animated, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AnimatedCount, Muted } from './ui';
import { useTouchMotion } from './motion';
import { colors, radius, spacing, typography } from '@/theme';

/** Pastille de filtre : libellé et compteur animé, bleu plein quand active. */
export function FilterChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const touch = useTouchMotion(0.95);
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}, ${count}`}
        hitSlop={4}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => { touch.pressOut(); void Haptics.selectionAsync().catch(() => undefined); onPress(); }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full,
          backgroundColor: active ? colors.accent : colors.canvas, borderWidth: 1, borderColor: active ? colors.accent : colors.line,
        }}
      >
        <Muted style={[typography.small, { color: active ? colors.white : colors.inkSoft, fontWeight: '600' }]}>{label}</Muted>
        <AnimatedCount value={count} style={{ ...typography.caption, color: active ? 'rgba(255,255,255,0.85)' : colors.subtle, letterSpacing: 0 }} />
      </Pressable>
    </Animated.View>
  );
}
