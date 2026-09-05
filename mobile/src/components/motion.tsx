import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { motion } from '@/theme';

/** Respecte le réglage iOS « Réduire les animations ». */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);

  return reduced;
}

/**
 * Entrée courte et native-driver. Elle donne un rythme commun aux écrans sans
 * ralentir la navigation ni animer la mise en page.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 10,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = React.useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return undefined;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
