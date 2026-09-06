/** Display cache only: never an authority for subscription or permissions. */
export function decodeDashboardSnapshot<T>(raw: string | null | undefined, token: string, now = Date.now()): T | null {
  try {
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || value.token !== token || !Number.isFinite(value.at) || value.at > now || now - value.at > 86_400_000) return null;
    return value.data ?? null;
  } catch { return null; }
}
