type Diagnostic = { area: string; durationMs: number; code: string; at: string };
const events: Diagnostic[] = [];
/** Bounded memory-only, no customer identifiers or request/exception content. */
export function recordDiagnostic(event: Omit<Diagnostic, 'at'>) {
  events.push({ ...event, at: new Date().toISOString() });
  if (events.length > 80) events.shift();
}
export function readDiagnostics() { return events.map(event => ({ ...event })); }
