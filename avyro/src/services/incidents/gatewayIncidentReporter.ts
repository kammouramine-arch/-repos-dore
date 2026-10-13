import { env } from '@/config';
import type { IncidentReporter } from '@/core/domain/ports/incidentReporter';
import { AppError } from '@/core/domain/errors/appError';
import type { HttpClient } from '@/services/http/httpClient';

export const createGatewayIncidentReporter = ({ http, getAccessToken }: { http: HttpClient; getAccessToken(): Promise<string | null> }): IncidentReporter => ({
  isConfigured: () => env.backendUrl.startsWith('https://'),
  async submit(category, observation) {
    const token = await getAccessToken();
    if (!env.backendUrl || !token) throw new AppError('network', 'Community reports are not connected.');
    await http.postJson(`${env.backendUrl}/incidents`, {
      category,
      latitude: observation.coordinates.latitude,
      longitude: observation.coordinates.longitude,
      observedAt: observation.timestamp,
      consent: true,
    }, (value) => {
      if (!value || typeof value !== 'object' || !('status' in value) || value.status !== 'pending') throw new AppError('invalid-response', 'Report was not accepted.');
      return null;
    }, { operation: 'incident.submit', headers: { Authorization: `Bearer ${token}` } });
  },
});
