import * as React from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from './motion';
import { colors } from '@/theme';

/** Small native-driven selection response, with no layout resize or delay. */
export function TabIcon({ focused, name, size, color }: {
  focused: boolean; name: keyof typeof Ionicons.glyphMap; size: number; color: string;
}) {
  const reduced = useReducedMotion();
  const [progress] = React.useState(() => new Animated.Value(focused ? 1 : 0));
  React.useEffect(() => {
    if (reduced) { progress.setValue(focused ? 1 : 0); return; }
    const animation = Animated.spring(progress, { toValue: focused ? 1 : 0, damping: 18, stiffness: 230, mass: 0.7, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [focused, reduced, progress]);
  return <Animated.View style={{ width: 48, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accentSoft : 'transparent', transform: [{ scale: reduced ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }, { translateY: reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
    <Ionicons name={name} size={size} color={color} />
  </Animated.View>;
}
