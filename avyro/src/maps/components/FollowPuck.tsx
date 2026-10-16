import { memo, useEffect, useRef, useState, type RefObject } from 'react';
import { Animated } from 'react-native';
import type MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';

import type { Coordinates } from '@/core/domain/entities/geo';
import { MAP_DEFAULTS } from '@/config';
import { createPoseInterpolator } from '@/maps/geometry/followPose';
import { NavigationArrow } from './NavigationArrow';

export interface FollowPuckProps {
  mapRef: RefObject<MapView | null>;
  /** Newest position: snapped to the route when on it, raw otherwise. */
  coordinate: Coordinates;
  /** Course to point along; null keeps the last one (stopped or unknown). */
  headingDegrees: number | null;
  routeGeometry?: readonly Coordinates[];
  segmentIndex?: number;
  /** The camera rides with the car. False once the driver pans the map. */
  following: boolean;
  pitch: number;
  /** Camera heading when the driver is not being followed. */
  freeCameraHeading: number;
}

/** Camera updates per second. The puck itself moves every frame. */
const CAMERA_HZ = 15;

/**
 * The driver's arrow and the follow camera, driven by one pose.
 *
 * Every frame samples the shared pose interpolator (see followPose.ts): the
 * arrow is moved to it directly, and the camera is re-aimed at it many times
 * a second with a matching short animation. The two cannot drift apart, so
 * the arrow stays put on screen while the map flows under it — rather than
 * the map gliding for 650 ms, stopping, and jumping with each GPS fix.
 *
 * Only this component re-renders per frame; the screen around it does not.
 */
const FollowPuckComponent = ({ mapRef, coordinate, headingDegrees, routeGeometry, segmentIndex = 0, following, pitch, freeCameraHeading }: FollowPuckProps) => {
  const [pose] = useState(createPoseInterpolator);
  const [position] = useState(() => ({ latitude: new Animated.Value(coordinate.latitude), longitude: new Animated.Value(coordinate.longitude) }));
  const [rotation] = useState(() => new Animated.Value(0));
  const live = useRef({ following, pitch, freeCameraHeading });
  useEffect(() => { live.current = { following, pitch, freeCameraHeading }; }, [following, pitch, freeCameraHeading]);

  useEffect(() => {
    pose.push(
      { coordinate, heading: headingDegrees, receivedAt: Date.now() },
      routeGeometry ? { geometry: routeGeometry, segmentIndex } : undefined,
    );
  }, [pose, coordinate, headingDegrees, routeGeometry, segmentIndex]);

  useEffect(() => {
    let frame = 0;
    let lastCamera = 0;
    const tick = () => {
      const now = Date.now();
      const sample = pose.sample(now);
      if (sample) {
        position.latitude.setValue(sample.coordinate.latitude);
        position.longitude.setValue(sample.coordinate.longitude);
        const { following: follow, pitch: tilt, freeCameraHeading: free } = live.current;
        const cameraHeading = follow ? sample.cameraHeading : free;
        rotation.setValue(((sample.heading - cameraHeading + 540) % 360) - 180);
        if (follow && now - lastCamera >= 1000 / CAMERA_HZ) {
          lastCamera = now;
          mapRef.current?.animateCamera(
            { center: sample.coordinate, heading: sample.cameraHeading, pitch: tilt, zoom: MAP_DEFAULTS.navigationCamera.zoom, altitude: MAP_DEFAULTS.navigationCamera.altitude },
            { duration: Math.round(1000 / CAMERA_HZ) + 20 },
          );
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pose, position, rotation, mapRef]);

  return (
    <Marker.Animated coordinate={position} anchor={{ x: 0.5, y: 0.5 }} zIndex={20} tracksViewChanges={false}>
      <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) }] }}>
        <NavigationArrow />
      </Animated.View>
    </Marker.Animated>
  );
};

export const FollowPuck = memo(FollowPuckComponent);
