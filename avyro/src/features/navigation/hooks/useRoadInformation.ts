import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useServices } from '@/app/runtime/AppRuntime';
import { useAuthStore, useLocationStore, useNavigationStore, usePreferencesStore } from '@/app/stores/hooks';
import type { UserPosition } from '@/core/domain/entities/geo';
import type { RoadEvidence } from '@/core/domain/ports/roadDataProvider';
import { isOnMatchedSegment, isRoadEvidenceCurrent, segmentAheadMeters } from '@/core/navigation/roadEvidence';
import { distanceBetween } from '@/utils/geo';
import { ROAD_DATA } from '@/config';

/** One bounded trace in memory; never fetch in the background or without opt-in. */
export function useRoadInformation(now: number): RoadEvidence | null {
  const { roadDataProvider } = useServices();
  const fix = useLocationStore((s) => s.position);
  const setRoadEvidence = useLocationStore((s) => s.setRoadEvidence);
  const consent = usePreferencesStore((s) => s.preferences.roadInformation);
  const vehicle = usePreferencesStore(s => s.preferences.vehicleType);
  const guiding = useNavigationStore((s) => s.status === 'guiding');
  const token = useAuthStore((s) => s.session?.token ?? 'guest');
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [result, setResult] = useState<{ evidence: RoadEvidence; token: string } | null>(null);
  const trace = useRef<UserPosition[]>([]);
  const pending = useRef<AbortController | null>(null);
  const lastRequest = useRef(0);
  const generation = useRef(0);
  const latest = useRef<RoadEvidence | null>(null);
  const enabled = vehicle === 'car' && active && consent && guiding && roadDataProvider.isConfigured();
  useEffect(() => { latest.current = result?.evidence ?? null; }, [result]);
  useEffect(() => { setRoadEvidence(enabled ? result?.evidence ?? null : null); return () => setRoadEvidence(null); }, [enabled, result, setRoadEvidence]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { generation.current++; pending.current?.abort(); trace.current = []; setResult(null); }
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    generation.current++;
    pending.current?.abort(); pending.current = null;
    trace.current = [];
    const cancel = () => { generation.current++; pending.current?.abort(); };
    return cancel;
  }, [enabled, token, roadDataProvider]);
  useEffect(() => {
    if (!enabled || !fix) return;
    const clock = Date.now();
    if (fix.timestamp > clock || clock - fix.timestamp > ROAD_DATA.evidenceTtlMs || fix.accuracy === null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > ROAD_DATA.maxAccuracyMeters) {
      trace.current = []; generation.current++; pending.current?.abort(); return;
    }
    const previous = trace.current.at(-1);
    if (previous && (fix.timestamp <= previous.timestamp || distanceBetween(previous.coordinates, fix.coordinates) > ROAD_DATA.maxTraceJumpMeters)) trace.current = [];
    trace.current = [...trace.current.filter((p) => clock - p.timestamp <= ROAD_DATA.traceTtlMs), fix].slice(-ROAD_DATA.maxTraceFixes);
    // While the car is still on the matched element the limit is known: no
    // request. Once it leaves, ask again promptly; a gateway without segment
    // geometry keeps the original fixed cadence.
    const held = latest.current;
    const anchored = !!held && segmentAheadMeters(held) >= ROAD_DATA.segmentMinAheadMeters;
    if (anchored && isOnMatchedSegment(held, fix, clock)) return;
    const interval = anchored ? ROAD_DATA.segmentRetryMs : ROAD_DATA.requestIntervalMs;
    if (pending.current || clock - lastRequest.current < interval || trace.current.length < 2 || distanceBetween(trace.current[0].coordinates, fix.coordinates) < ROAD_DATA.minTraceMovementMeters) return;
    const controller = new AbortController(); pending.current = controller; lastRequest.current = clock;
    const requestGeneration = generation.current;
    void roadDataProvider.lookup(trace.current, controller.signal).then((result) => {
      if (!controller.signal.aborted && requestGeneration === generation.current && token) setResult({ evidence: result, token });
    }).catch(() => {
      if (requestGeneration === generation.current) setResult(null);
    }).finally(() => { if (pending.current === controller) pending.current = null; });
  }, [enabled, fix, roadDataProvider, token]);
  // GPS callbacks may arrive after the display's most recent one-second tick.
  const displayClock = fix && fix.timestamp <= now + 1000 ? Math.max(now, fix.timestamp) : now;
  return enabled && result?.token === token && isRoadEvidenceCurrent(result.evidence, fix, displayClock) ? result.evidence : null;
}
