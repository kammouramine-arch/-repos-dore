import { RECOMMENDATION } from '@/config';
import type { StopSuggestion } from '@/core/domain/entities/conversation';

/**
 * Chooses which stop to suggest.
 *
 * Three things decide it, in the order a driver would weigh them:
 *
 * 1. **Is it on the way?** A stop behind you is a U-turn, not an option.
 * 2. **What does it cost?** Measured in minutes added to the trip, not in
 *    distance from where you happen to be sitting.
 * 3. **Is it any good?** A rating only breaks ties; nobody drives eight extra
 *    minutes for half a star.
 *
 * A missing rating scores as neutral rather than as bad — most of the world's
 * open map data has no rating, and penalising it would rank the unrated
 * café behind a mediocre one that happens to be reviewed.
 */

/** Higher is better. Exported so the weighting can be asserted directly. */
export const scoreStop = (suggestion: StopSuggestion, hasRoute: boolean): number => {
  const rating = suggestion.place.rating ?? RECOMMENDATION.neutralRating;
  const quality = (rating - RECOMMENDATION.neutralRating) * RECOMMENDATION.ratingWeight;

  if (!hasRoute) {
    // Nothing planned: proximity is the only cost there is.
    const kilometres = suggestion.directDistanceMeters / 1000;
    return quality - kilometres * RECOMMENDATION.proximityWeightPerKm;
  }

  const minutes = suggestion.detourSeconds / 60;
  const ahead = suggestion.isAhead ? RECOMMENDATION.aheadBonus : 0;

  return quality + ahead - minutes * RECOMMENDATION.detourWeightPerMinute;
};

export interface RankOptions {
  /** False when there is no trip, which changes what "cost" means. */
  hasRoute: boolean;
  /** Suggestions costing more than this are not offered at all. */
  maxDetourSeconds?: number;
}

/**
 * Ranks candidates best-first, dropping the ones not worth mentioning.
 *
 * The filter matters as much as the sort: offering a driver a twenty-minute
 * detour for coffee is not a helpful answer, it is a worse one than "nothing
 * nearby".
 */
export const rankStops = (
  candidates: readonly StopSuggestion[],
  { hasRoute, maxDetourSeconds = RECOMMENDATION.maxDetourSeconds }: RankOptions,
): StopSuggestion[] =>
  candidates
    .filter((candidate) => !hasRoute || candidate.detourSeconds <= maxDetourSeconds)
    .map((candidate) => ({ candidate, score: scoreStop(candidate, hasRoute) }))
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);

/** True when a rating is good enough to be worth saying out loud. */
export const isHighlyRated = (rating: number | undefined): boolean =>
  rating !== undefined && rating >= RECOMMENDATION.highlyRatedFrom;
