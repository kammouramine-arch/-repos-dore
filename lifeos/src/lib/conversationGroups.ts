import type { ConversationSummary } from '@/services/conversations';

export type HistoryRow =
  | { kind: 'header'; label: string }
  | { kind: 'row'; conversation: ConversationSummary };

/**
 * Groups conversations by recency for the history list.
 *
 * Flattened into one array rather than a SectionList so the list, its empty state and
 * its loading state stay a single code path.
 */
export function groupByAge(
  conversations: ConversationSummary[],
  now: Date = new Date(),
): HistoryRow[] {
  const buckets: { label: string; maxDays: number; items: ConversationSummary[] }[] = [
    { label: 'Today', maxDays: 0, items: [] },
    { label: 'Yesterday', maxDays: 1, items: [] },
    { label: 'Previous 7 days', maxDays: 7, items: [] },
    { label: 'Previous 30 days', maxDays: 30, items: [] },
    { label: 'Older', maxDays: Infinity, items: [] },
  ];

  for (const conversation of conversations) {
    const updated = new Date(conversation.updated_at);
    // Calendar days, not elapsed hours: something from 11pm last night belongs under
    // "Yesterday" at 9am, not under "Today".
    const days = Number.isNaN(updated.getTime())
      ? Infinity
      : Math.floor((startOfDay(now) - startOfDay(updated)) / 86_400_000);
    const bucket = buckets.find((b) => days <= b.maxDays) ?? buckets[buckets.length - 1];
    bucket.items.push(conversation);
  }

  return buckets.flatMap<HistoryRow>((bucket) =>
    bucket.items.length === 0
      ? []
      : [
          { kind: 'header', label: bucket.label },
          ...bucket.items.map((conversation) => ({ kind: 'row' as const, conversation })),
        ],
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
