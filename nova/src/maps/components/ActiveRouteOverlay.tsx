import { Polyline } from 'react-native-maps';

import type { Coordinates } from '@/core/domain/entities/geo';
import type { Route } from '@/core/domain/entities/route';
import { colors } from '@/ui/theme';

export interface ActiveRouteOverlayProps {
  route: Route;
  /** Index of the segment the driver is currently on. */
  segmentIndex: number;
  /** Position snapped to the route — where the driven part ends. */
  snappedPosition: Coordinates;
}

/**
 * Route geometry during guidance: the road already driven fades back, the road
 * ahead stays lit. Splitting at the snapped position (rather than at the
 * nearest vertex) keeps the boundary exactly under the puck.
 */
export const ActiveRouteOverlay = ({
  route,
  segmentIndex,
  snappedPosition,
}: ActiveRouteOverlayProps) => {
  const driven = [...route.geometry.slice(0, segmentIndex + 1), snappedPosition];
  const remaining = [snappedPosition, ...route.geometry.slice(segmentIndex + 1)];

  return (
    <>
      <Polyline
        coordinates={route.geometry}
        strokeColor={colors.routeCasing}
        strokeWidth={13}
        lineCap="round"
        lineJoin="round"
        zIndex={1}
      />
      {driven.length > 1 ? (
        <Polyline
          coordinates={driven}
          strokeColor={colors.routeInactive}
          strokeWidth={7}
          lineCap="round"
          lineJoin="round"
          zIndex={2}
        />
      ) : null}
      <Polyline
        coordinates={remaining}
        strokeColor={colors.routeActive}
        strokeWidth={8}
        lineCap="round"
        lineJoin="round"
        zIndex={3}
      />
    </>
  );
};
