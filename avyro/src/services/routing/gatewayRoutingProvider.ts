import { env } from '@/config';
import type { Preferences } from '@/core/domain/entities/preferences';
import type { Route } from '@/core/domain/entities/route';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';
import { AppError } from '@/core/domain/errors/appError';
import { reconcileManeuvers } from '@/core/navigation/maneuverGeometry';
import type { HttpClient } from '@/services/http/httpClient';

const point = (p: Route['geometry'][number]) => p && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
const types = new Set(['depart','straight','slight-left','slight-right','turn-left','turn-right','sharp-left','sharp-right','uturn','roundabout','merge','fork','ramp','arrive','waypoint','ferry','follow']);
export function decodeGatewayRoutes(raw: unknown): Route[] {
  const routes = raw as Route[];
  if (!Array.isArray(routes) || !routes.length || routes.length > 3 || routes.some(route => !route || typeof route.id !== 'string' || !Number.isFinite(route.distanceMeters) || route.distanceMeters <= 0 || !Number.isFinite(route.durationSeconds) || route.durationSeconds < 0 || typeof route.summary !== 'string' || !Array.isArray(route.geometry) || route.geometry.length < 2 || route.geometry.length > 30000 || !route.geometry.every(point) || !Array.isArray(route.steps) || !route.steps.length || route.steps.length > 2000 || route.steps.some(step => !step || typeof step.id !== 'string' || typeof step.instruction !== 'string' || step.instruction.length > 300 || !types.has(step.maneuver) || !Number.isFinite(step.distanceMeters) || step.distanceMeters < 0 || !Number.isFinite(step.durationSeconds) || step.durationSeconds < 0 || !point(step.location)))) throw new AppError('invalid-response', 'Driving route rejected.');
  // Every turn instruction must agree with the line the car will drive.
  return routes.map(route => reconcileManeuvers(route).route);
}
export const createGatewayRoutingProvider = ({ http, getAccessToken, getPreferences }: { http: HttpClient; getAccessToken(): Promise<string | null>; getPreferences?(): Promise<Pick<Preferences, 'vehicleType' | 'avoidTolls' | 'avoidMotorways'>> }): RoutingProvider => ({
  async getRoutes({ origin, destination, waypoints = [], alternatives = true, signal }) {
    const token = await getAccessToken();
    if (!token) throw new AppError('network', 'Route service could not connect.');
    const saved = await getPreferences?.();
    const preferences = saved ? { vehicleType: saved.vehicleType, avoidTolls: saved.avoidTolls, avoidMotorways: saved.avoidMotorways } : undefined;
    return http.postJson(`${env.backendUrl}/routes`, { origin, destination, waypoints, alternatives, ...(preferences ? { preferences } : {}) }, decodeGatewayRoutes, { signal, operation: 'routing.route', timeoutMs: 20000, headers: { Authorization: `Bearer ${token}` } });
  },
});
