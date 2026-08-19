import { FREE_LIMITS, type ProFeature } from '@/config/subscription';
import { useAiUsage, useSubscription } from './useProfile';

/**
 * Single place that answers "can they do this?". Gates are about depth of planning,
 * never about hiding the basics — the free app is still a working planner.
 */
export function useEntitlement() {
  const { data: subscription } = useSubscription();
  const { data: usedToday = 0 } = useAiUsage();

  const isPro = subscription?.tier === 'pro' && subscription.status === 'active';
  const remainingMessages = isPro
    ? Infinity
    : Math.max(0, FREE_LIMITS.aiMessagesPerDay - usedToday);

  return {
    isPro,
    tier: (subscription?.tier ?? 'free') as 'free' | 'pro',
    remainingMessages,
    canSendMessage: isPro || remainingMessages > 0,
    can: (feature: ProFeature) => isPro || !isProOnly(feature),
    limits: FREE_LIMITS,
  };
}

function isProOnly(feature: ProFeature) {
  return [
    'ninety_day_plan',
    'weekly_ai_plan',
    'life_reset',
    'voice',
    'advanced_memory',
    'insights',
  ].includes(feature);
}
