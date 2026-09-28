/**
 * Limitation de débit, au mieux.
 *
 * La mémoire d'une fonction serverless ne survit pas d'une instance à
 * l'autre : ceci arrête les envois répétés d'un même visiteur, pas une
 * attaque distribuée. C'est un garde-fou, derrière le champ-piège et le
 * temps de remplissage minimal.
 */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function limited(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);

    /* La table ne grossit pas indéfiniment sur une instance chaude. */
    if (hits.size > 1000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }

    return recent.length > max;
  };
}
