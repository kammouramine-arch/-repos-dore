import { env } from '@/config';
import type { RoadDataProvider, RoadEvidence } from '@/core/domain/ports/roadDataProvider';
import { AppError } from '@/core/domain/errors/appError';
import type { HttpClient } from '@/services/http/httpClient';

export const createGatewayRoadDataProvider = ({ http, getAccessToken }: { http: HttpClient; getAccessToken(): Promise<string | null> }): RoadDataProvider => ({
  isConfigured: () => env.roadDataEnabled && env.backendUrl.startsWith('https://'),
  async lookup(fixes, signal) {
    if (!this.isConfigured()) throw new AppError('network', 'Road information is not connected.');
    const token = await getAccessToken();
    if (!token || fixes.length < 2) throw new AppError('network', 'Road information needs a connection and accurate location.');
    const position = fixes[fixes.length - 1];
    return http.postJson(`${env.backendUrl}/roads/context`, { consent: true, fixes: fixes.map((fix) => ({ ...fix.coordinates, accuracy: fix.accuracy, timestamp: fix.timestamp })) }, (raw): RoadEvidence => {
      const value = raw as Partial<RoadEvidence> & { status?: string } | null;
      const limit = value?.speedLimit;
      if (!value || value.source !== 'TomTom map data' || !['matched', 'unavailable'].includes(value.status ?? '') || !Number.isFinite(value.capturedAt) || value.capturedAt !== position.timestamp || !Number.isFinite(value.expiresAt) || value.expiresAt !== position.timestamp + 5000 || (limit != null && (value.status !== 'matched' || !Number.isInteger(limit.value) || limit.value <= 0 || limit.value > 300 || !['km/h', 'mph'].includes(limit.unit)))) throw new AppError('invalid-response', 'Road information was rejected.');
      return { source: 'TomTom map data', capturedAt: value.capturedAt!, expiresAt: value.expiresAt!, speedLimit: limit ? { value: limit.value, unit: limit.unit } : null, position };
    }, { operation: 'roads.context', signal, timeoutMs: 4000, headers: { Authorization: `Bearer ${token}` } });
  },
});
