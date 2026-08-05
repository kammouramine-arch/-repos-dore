import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/ui/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: ViewStyle | ViewStyle[];
  /** How far the element shrinks while held. */
  activeScale?: number;
  /** Dim as well as shrink — right for large surfaces, wrong for small icons. */
  dim?: boolean;
}

/**
 * The press feel of the entire app: a spring-damped shrink on touch down.
 * Runs on the UI thread, so it stays honest while the map is redrawing.
 */
export const PressableScale = ({
  style,
  activeScale = 0.97,
  dim = false,
  disabled,
  ...rest
}: PressableScaleProps) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(1 - pressed.value * (1 - activeScale), motion.spring) },
    ],
    opacity: withTiming(dim && pressed.value ? 0.85 : 1, { duration: motion.fast }),
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        pressed.value = 1;
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = 0;
        rest.onPressOut?.(event);
      }}
      style={[style, animatedStyle, disabled ? { opacity: 0.45 } : null]}
    />
  );
};
