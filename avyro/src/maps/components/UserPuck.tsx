import { memo, useEffect, useRef, useState } from 'react';
import { Marker } from 'react-native-maps';
import { Animated, Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Coordinates } from '@/core/domain/entities/geo';
import { colors, palette } from '@/ui/theme';

export interface UserPuckProps {
  coordinate: Coordinates;
  /** Course over ground; the cone points where the car is heading. */
  headingDegrees?: number | null;
  cameraHeadingDegrees?: number;
}

const SIZE = 56;

/**
 * The driver's position.
 *
 * `tracksViewChanges` is off on purpose: leaving it on re-rasterises the marker
 * on every frame and visibly costs frames while the map is moving.
 */
const UserPuckComponent = ({ coordinate, headingDegrees, cameraHeadingDegrees = 0 }: UserPuckProps) => {
  const [animated] = useState(() => ({ latitude: new Animated.Value(coordinate.latitude), longitude: new Animated.Value(coordinate.longitude) }));
  const [rotation] = useState(() => new Animated.Value(headingDegrees != null && headingDegrees >= 0 ? headingDegrees : 0));
  const lastHeading = useRef(headingDegrees != null && headingDegrees >= 0 ? headingDegrees : 0);
  useEffect(() => {
    if (headingDegrees != null && Number.isFinite(headingDegrees) && headingDegrees >= 0) lastHeading.current = headingDegrees % 360;
    const target = lastHeading.current - (Platform.OS === 'ios' ? cameraHeadingDegrees : 0);
    let active = true;
    rotation.stopAnimation(current => {
      if (!active) return;
      const delta = ((target - current) % 360 + 540) % 360 - 180;
      Animated.timing(rotation, { toValue: current + delta, duration: 850, useNativeDriver: Platform.OS === 'ios' }).start();
    });
    return () => { active = false; rotation.stopAnimation(); };
  }, [headingDegrees, cameraHeadingDegrees, rotation]);
  const { latitude, longitude } = coordinate;
  useEffect(() => {
    const movement = Animated.parallel([
      Animated.timing(animated.latitude, { toValue: latitude, duration: 850, useNativeDriver: false }),
      Animated.timing(animated.longitude, { toValue: longitude, duration: 850, useNativeDriver: false }),
    ]);
    movement.start();
    return () => movement.stop();
  }, [animated, latitude, longitude]);
  return (
  <Marker.Animated
    coordinate={animated}
    anchor={{ x: 0.5, y: 0.5 }}
    flat
    rotation={Platform.OS === 'android' ? rotation : 0}
    tracksViewChanges={false}
    zIndex={20}
  >
    <Animated.View style={Platform.OS === 'ios' ? { transform: [{ rotate: rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }] } : undefined}>
    <Svg width={SIZE} height={SIZE} viewBox="0 0 56 56">
      <Circle cx="28" cy="28" r="26" fill="rgba(8, 127, 131, 0.14)" />
      <Path d="M28 8 L43 42 L28 35 L13 42 Z" fill={colors.accent} stroke={palette.white} strokeWidth="3" strokeLinejoin="round" />
    </Svg>
    </Animated.View>
  </Marker.Animated>
); };

export const UserPuck = memo(UserPuckComponent);
