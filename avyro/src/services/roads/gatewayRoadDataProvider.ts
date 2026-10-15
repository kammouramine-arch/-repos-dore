import { env } from '@/config';
import type { RoadDataProvider, RoadEvidence, RoadAheadEvidence, RoadAlert } from '@/core/domain/ports/roadDataProvider';
import { AppError } from '@/core/domain/errors/appError';
import type { HttpClient } from '@/services/http/httpClient';

export const createGatewayRoadDataProvider = ({ http, getAccessToken }: { http: HttpClient; getAccessToken(): Promise<string | null> }): RoadDataProvider => ({
  isConfigured: () => env.roadDataEnabled && env.backendUrl.startsWith('https://'),
  async lookupAhead(geometry, signal) {
    const token = await getAccessToken();
    if (!token || !this.isConfigured()) throw new AppError('network', 'Road information unavailable.');
    return http.postJson(`${env.backendUrl}/roads/ahead`, { consent: true, geometry: geometry.map(p => [p.longitude, p.latitude]) }, (raw): RoadAheadEvidence => {
      const value = raw as Partial<RoadAheadEvidence> | null;
      if (value?.source !== 'TomTom map data' || !Array.isArray(value.alerts) || value.alerts.length > 50 || !Number.isFinite(value.expiresAt) || value.expiresAt! > Date.now() + 305000 || value.expiresAt! <= Date.now()) throw new AppError('invalid-response', 'Road information rejected.');
      const alerts = value.alerts.filter((item): item is RoadAlert => typeof item?.id === 'string' && item.id.length <= 100 && item.source === 'TomTom map data' && ['stop','yield','traffic-light','traffic-light-warning','limited-access','ramp','numbered-road'].includes(item.kind) && Number.isFinite(item.coordinate?.latitude) && Math.abs(item.coordinate.latitude) <= 90 && Number.isFinite(item.coordinate?.longitude) && Math.abs(item.coordinate.longitude) <= 180).map(item => ({ id: item.id, kind: item.kind, coordinate: item.coordinate, source: item.source, ...(typeof item.label === 'string' && /^[A-Z]{0,3}[0-9]{1,4}(?:-[A-Z0-9]{1,3})?$/.test(item.label) ? { label: item.label } : {}) }));
      const segments = Array.isArray(value.segments) && value.segments.length <= 100 ? value.segments.filter(segment => segment && Array.isArray(segment.geometry) && segment.geometry.length >= 2 && segment.geometry.length <= 2000 && segment.geometry.every(p => Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) && Number.isInteger(segment.speedLimit?.value) && segment.speedLimit.value > 0 && segment.speedLimit.value <= 300 && ['km/h', 'mph'].includes(segment.speedLimit.unit)) : [];
      return { source: 'TomTom map data', alerts, segments, expiresAt: value.expiresAt! };
    }, { signal, timeoutMs: 5000, operation: 'roads.ahead', headers: { Authorization: `Bearer ${token}` } });
  },
  async lookup(fixes, signal) {
    if (!this.isConfigured()) throw new AppError('network', 'Road information is not connected.');
    const token = await getAccessToken();
    if (!token || fixes.length < 2) throw new AppError('network', 'Road information needs a connection and accurate location.');
    const position = fixes[fixes.length - 1];
    return http.postJson(`${env.backendUrl}/roads/context`, { consent: true, fixes: fixes.map((fix) => ({ ...fix.coordinates, accuracy: fix.accuracy, timestamp: fix.timestamp, ...(fix.speed != null && fix.speed >= 1.5 && fix.heading != null && Number.isFinite(fix.heading) && fix.heading >= 0 && fix.heading < 360 ? { heading: fix.heading } : {}) })) }, (raw): RoadEvidence => {
      const value = raw as Partial<RoadEvidence> & { status?: string } | null;
      const limit = value?.speedLimit;
      if (!value || value.source !== 'TomTom map data' || !['matched', 'unavailable'].includes(value.status ?? '') || !Number.isFinite(value.capturedAt) || value.capturedAt !== position.timestamp || !Number.isFinite(value.expiresAt) || value.expiresAt !== position.timestamp + 5000 || (limit != null && (value.status !== 'matched' || !Number.isInteger(limit.value) || limit.value <= 0 || limit.value > 300 || !['km/h', 'mph'].includes(limit.unit)))) throw new AppError('invalid-response', 'Road information was rejected.');
      const signs = Array.isArray(value.recentSegmentSigns) ? value.recentSegmentSigns.filter(item => typeof item?.type === 'string' && /^[A-Za-z]{1,70}Sign$/.test(item.type)).slice(0, 20).map(item => ({ type: item.type })) : [];
      return { ...(value.status === 'matched' && typeof value.roadName === 'string' && value.roadName.length <= 150 ? { roadName: value.roadName } : {}), ...(value.countryCode === 'FRA' ? { countryCode: 'FRA' } : {}), ...(value.legalRoadCategory === 'other-road' ? { legalRoadCategory: 'other-road' as const } : {}), source: 'TomTom map data', capturedAt: value.capturedAt!, expiresAt: value.expiresAt!, speedLimit: limit ? { value: limit.value, unit: limit.unit, ...(limit.source === 'municipal-order' && limit.authority === 'wattignies-23-405' ? { source: 'municipal-order' as const, authority: 'wattignies-23-405' as const } : {}) } : null, recentSegmentSigns: signs, position };
    }, { operation: 'roads.context', signal, timeoutMs: 4000, headers: { Authorization: `Bearer ${token}` } });
  },
});
