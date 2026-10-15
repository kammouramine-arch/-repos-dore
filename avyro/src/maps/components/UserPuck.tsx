import { memo, useEffect, useRef, useState } from 'react';
import { Marker } from 'react-native-maps';
import { Animated, Platform } from 'react-native';

import type { Coordinates } from '@/core/domain/entities/geo';
import { AvyroRoadster } from './AvyroRoadster';
import { puckMotionPath } from '@/maps/geometry/puckMotion';
import { distanceBetween } from '@/utils/geo';

export interface UserPuckProps {
  coordinate: Coordinates;
  /** Course over ground; the cone points where the car is heading. */
  headingDegrees?: number | null;
  cameraHeadingDegrees?: number;
  routeGeometry?: readonly Coordinates[];
  segmentIndex?: number;
}

/**
 * The driver's position.
 *
 * Coordinates follow route vertices between fixes; rotation is relative to the
 * measured camera heading, rather than its not-yet-reached animation target.
 */
const UserPuckComponent = ({ coordinate, headingDegrees, cameraHeadingDegrees = 0, routeGeometry, segmentIndex = 0 }: UserPuckProps) => {
  const [animated] = useState(() => ({ latitude: new Animated.Value(coordinate.latitude), longitude: new Animated.Value(coordinate.longitude) }));
  const [rotation] = useState(() => new Animated.Value(headingDegrees != null && headingDegrees >= 0 ? headingDegrees : 0));
  const lastHeading = useRef(headingDegrees != null && headingDegrees >= 0 ? headingDegrees : 0);
  const drawn = useRef(coordinate);
  useEffect(() => {
    const lat = animated.latitude.addListener(({ value }) => { drawn.current = { ...drawn.current, latitude: value }; });
    const lon = animated.longitude.addListener(({ value }) => { drawn.current = { ...drawn.current, longitude: value }; });
    return () => { animated.latitude.removeListener(lat); animated.longitude.removeListener(lon); };
  }, [animated]);
  useEffect(() => {
    if (headingDegrees != null && Number.isFinite(headingDegrees) && headingDegrees >= 0) lastHeading.current = headingDegrees % 360;
    const target = lastHeading.current - (Platform.OS === 'ios' ? cameraHeadingDegrees : 0);
    let active = true;
    rotation.stopAnimation(current => {
      if (!active) return;
      const delta = ((target - current) % 360 + 540) % 360 - 180;
      Animated.timing(rotation, { toValue: current + delta, duration: 220, useNativeDriver: Platform.OS === 'ios' }).start();
    });
    return () => { active = false; rotation.stopAnimation(); };
  }, [headingDegrees, cameraHeadingDegrees, rotation]);
  const { latitude, longitude } = coordinate;
  useEffect(() => {
    const path = puckMotionPath(drawn.current, { latitude, longitude }, routeGeometry, segmentIndex);
    const lengths = path.slice(1).map((p, i) => distanceBetween(path[i], p));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    const movement = Animated.sequence(path.slice(1).map((p, i) => Animated.parallel([
      Animated.timing(animated.latitude, { toValue: p.latitude, duration: total > 100 ? 0 : total ? 650 * lengths[i] / total : 0, useNativeDriver: false }),
      Animated.timing(animated.longitude, { toValue: p.longitude, duration: total > 100 ? 0 : total ? 650 * lengths[i] / total : 0, useNativeDriver: false }),
    ])));
    movement.start();
    return () => movement.stop();
  }, [animated, latitude, longitude, routeGeometry, segmentIndex]);
  return (
  <Marker.Animated
    coordinate={animated}
    anchor={{ x: 0.5, y: 0.5 }}
    flat
    rotation={Platform.OS === 'android' ? rotation : 0}
    tracksViewChanges={Platform.OS === 'ios'}
    zIndex={20}
  >
    <Animated.View style={Platform.OS === 'ios' ? { transform: [{ rotate: rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }] } : undefined}>
    <AvyroRoadster />
    </Animated.View>
  </Marker.Animated>
); };

export const UserPuck = memo(UserPuckComponent);
