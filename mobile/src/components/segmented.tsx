import * as React from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows } from '@/theme';
import { useReducedMotion } from './motion';

/**
 * Sélecteur à segments.
 *
 * Même principe que la barre de navigation : ce n'est pas la couleur du
 * libellé qui change, c'est la pastille qui glisse. Le libellé garde sa
 * graisse d'un état à l'autre, sans quoi la largeur du segment sauterait au
 * moment du basculement.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; count?: number }[];
  onChange: (id: T) => void;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = React.useState(0);
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  const slot = width ? (width - 8) / options.length : 0;
  const slide = useSharedValue(0);
  const positioned = React.useRef(false);

  React.useEffect(() => {
    if (!slot) return;
    const target = index * slot;
    if (!positioned.current || reduced) {
      positioned.current = true;
      slide.value = target;
      return;
    }
    slide.value = withSpring(target, { damping: 20, stiffness: 240, mass: 0.7 });
  }, [index, reduced, slide, slot]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value }] }));

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: radius.full,
        backgroundColor: colors.surface2,
      }}
    >
      {slot > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 4,
              top: 4,
              bottom: 4,
              width: slot,
              borderRadius: radius.full,
              backgroundColor: colors.canvas,
              ...shadows.card,
            },
            pill,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(option.id);
            }}
            style={{ flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
          >
            <Text style={{ fontSize: 14.5, fontWeight: '600', color: active ? colors.ink : colors.muted }}>
              {option.label}
            </Text>
            {option.count != null && option.count > 0 ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? colors.accent : colors.subtle }}>
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
