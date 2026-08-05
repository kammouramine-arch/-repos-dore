import { Fragment, memo } from 'react';
import { Polyline } from 'react-native-maps';

import type { Route } from '@/core/domain/entities/route';
import { colors } from '@/ui/theme';

export interface RouteOverlayProps {
  routes: readonly Route[];
  selectedRouteId: string;
  /** Tapping an alternative selects it, exactly as on the preview card. */
  onSelectRoute?: (routeId: string) => void;
}

/**
 * Route geometry for the preview map.
 *
 * Draw order matters: alternatives first, then the selected route's dark casing,
 * then its coloured core — that is what gives the active line a clean edge
 * wherever the routes overlap.
 */
const RouteOverlayComponent = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}: RouteOverlayProps) => {
  const selected = routes.find((route) => route.id === selectedRouteId) ?? routes[0];

  return (
    <>
      {routes
        .filter((route) => route.id !== selected?.id)
        .map((route) => (
          <Polyline
            key={route.id}
            coordinates={route.geometry}
            strokeColor={colors.routeInactive}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
            tappable={Boolean(onSelectRoute)}
            onPress={() => onSelectRoute?.(route.id)}
            zIndex={1}
          />
        ))}

      {selected ? (
        <Fragment key={selected.id}>
          <Polyline
            coordinates={selected.geometry}
            strokeColor={colors.routeCasing}
            strokeWidth={11}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
          <Polyline
            coordinates={selected.geometry}
            strokeColor={colors.routeActive}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
            zIndex={3}
          />
        </Fragment>
      ) : null}
    </>
  );
};

export const RouteOverlay = memo(RouteOverlayComponent);
