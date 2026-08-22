import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, Text } from '@/components/ui';
import { friendlyDate } from '@/utils/date';

/**
 * What the user sees when they run out of AI, or ask for something their plan does not
 * include. It is an offer, not a wall: the plan they already have is untouched and
 * still open behind this card.
 */
export function LimitReached({
  kind,
  message,
  upgradeName,
  resetsAt,
  onDismiss,
}: {
  kind: 'quota_exceeded' | 'not_entitled';
  message?: string;
  upgradeName?: string | null;
  resetsAt?: string | null;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const quota = kind === 'quota_exceeded';

  return (
    <Card tone="accent" elevated={false}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
          <Feather
            name={quota ? 'battery' : 'lock'}
            size={18}
            color={theme.colors.accentText}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title3">
              {quota ? "You've reached your current AI limit." : 'That needs a different plan.'}
            </Text>
            <Text variant="callout" color="secondary">
              {message ??
                (quota
                  ? 'Your life plan is still here — nothing is locked.'
                  : 'Everything you have built stays available.')}
            </Text>
            {quota && resetsAt ? (
              <Text variant="footnote" color="tertiary">
                Your allowance resets {friendlyDate(resetsAt)}.
              </Text>
            ) : null}
          </View>
        </View>

        <Text variant="footnote" color="secondary">
          Your goals, tasks, habits, projects, calendar and Life Map are open as usual.
          {quota ? ' Only new AI requests are paused.' : ''}
        </Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button
            label={upgradeName ? `Upgrade to ${upgradeName}` : 'See plans'}
            onPress={() => router.push('/paywall')}
          />
          <Button label="View plans" variant="secondary" onPress={() => router.push('/paywall')} />
          {onDismiss ? <Button label="Not now" variant="ghost" onPress={onDismiss} /> : null}
        </View>
      </View>
    </Card>
  );
}
