import { memo, useMemo } from 'react';
import { Polyline } from 'react-native-maps';

import type { Coordinates } from '@/core/domain/entities/geo';
import type { RouteIndex } from '@/core/navigation/routeIndex';
import { sliceRouteWindow } from '@/maps/geometry/routeWindow';
import { colors } from '@/ui/theme';

export interface ActiveRouteOverlayProps {
  routeIndex: RouteIndex;
  /** Index of the geometry segment the driver is currently on. */
  segmentIndex: number;
  /** Position snapped to the route — where the driven part ends. */
  snappedPosition: Coordinates;
}

/**
 * Route geometry during guidance: the road already driven fades back, the road
 * ahead stays lit. Splitting at the snapped position (rather than at the
 * nearest vertex) keeps the boundary exactly under the puck.
 *
 * Only a window around the driver is drawn, and the vertex slices are memoised
 * on the segment index — so a fix that does not cross a vertex costs two array
 * joins rather than three copies of the whole route.
 */
const ActiveRouteOverlayComponent = ({
  routeIndex,
  segmentIndex,
  snappedPosition,
}: ActiveRouteOverlayProps) => {
  const window = useMemo(
    () => sliceRouteWindow(routeIndex, segmentIndex),
    [routeIndex, segmentIndex],
  );

  const driven = useMemo(
    () => [...window.behind, snappedPosition],
    [window.behind, snappedPosition],
  );
  const remaining = useMemo(
    () => [snappedPosition, ...window.ahead],
    [window.ahead, snappedPosition],
  );
  const casing = useMemo(() => [...driven, ...window.ahead], [driven, window.ahead]);

  return (
    <>
      <Polyline
        coordinates={casing}
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

export const ActiveRouteOverlay = memo(ActiveRouteOverlayComponent);
