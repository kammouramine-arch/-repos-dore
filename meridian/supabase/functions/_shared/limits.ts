/**
 * Free-tier limits. Shared by the app (to show remaining quota and gate UI) and by
 * the edge function (which is the only place that actually enforces them).
 */
export const FREE_LIMITS = {
  aiMessagesPerDay: 15,
  activeGoals: 3,
  habits: 3,
  projects: 1,
} as const;

export const AI_MODEL_DEFAULT = 'claude-opus-5';
export const AI_EFFORT_DEFAULT = 'high';
