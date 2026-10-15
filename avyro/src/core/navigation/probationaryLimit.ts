export type FrenchRoadCategory = 'motorway-normal-130' | 'other-motorway' | 'divided-road' | 'other-road';

/** Code de la route R413-5. Lower posted/conditional restrictions always win.
 * Never infer a legal category from the posted number alone.
 * https://www.service-public.gouv.fr/particuliers/vosdroits/F19460
 */
export function probationaryMaximum(enabled: boolean, country: string | undefined, category: FrenchRoadCategory | undefined, postedKmh: number | null): number | null {
  if (!enabled || country !== 'FRA' || !category || postedKmh == null || !Number.isFinite(postedKmh) || postedKmh <= 0) return null;
  const maxima: Record<FrenchRoadCategory, number> = { 'motorway-normal-130': 110, 'other-motorway': 100, 'divided-road': 100, 'other-road': 80 };
  return maxima[category] ? Math.min(postedKmh, maxima[category]) : null;
}
