import React from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Card, ProgressBar, Text } from '@/components/ui';
import type { QuotaView } from '@/hooks/useEntitlements';
import { friendlyDate } from '@/utils/date';

/**
 * How much AI access is left, in plain language.
 *
 * Deliberately not a technical readout: a bar, a percentage, and when it resets. The
 * breakdown underneath is there for people who want it, not to make the app feel like
 * a billing console.
 */
export function UsageMeter({
  headline,
  quotas,
  resetsAt,
  compact = false,
}: {
  headline: QuotaView;
  quotas?: QuotaView[];
  resetsAt?: string | null;
  compact?: boolean;
}) {
  const theme = useTheme();
  const remaining = headline.percentRemaining;
  const tone =
    remaining > 40 ? theme.colors.accent : remaining > 10 ? theme.colors.highlight : theme.colors.danger;

  return (
    <Card>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text variant="overline" color="tertiary">
            AI USAGE
          </Text>
          <Text variant="title3" style={{ color: tone }}>
            {remaining}%
          </Text>
        </View>

        <ProgressBar progress={remaining} color={tone} height={8} />

        <Text variant="footnote" color="secondary">
          {headline.fairUse
            ? `${headline.label} — high limits on your plan, subject to fair use.`
            : `${headline.remaining.toLocaleString('en-US')} of ${headline.limit.toLocaleString('en-US')} ${headline.unit} left.`}
          {resetsAt ? ` Resets ${friendlyDate(resetsAt)}.` : ''}
        </Text>

        {!compact && quotas?.length ? (
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            {quotas.map((quota) => (
              <View key={quota.meter} style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="subhead" color={quota.included ? 'primary' : 'tertiary'}>
                    {quota.label}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {quota.included
                      ? quota.fairUse
                        ? 'Fair use'
                        : `${quota.percentRemaining}% left`
                      : 'Not included'}
                  </Text>
                </View>
                {quota.included ? (
                  <ProgressBar
                    progress={quota.percentRemaining}
                    height={4}
                    color={quota.percentRemaining > 10 ? theme.colors.borderStrong : theme.colors.danger}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {!compact ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 2 }}>
            <Feather name="info" size={12} color={theme.colors.textTertiary} style={{ marginTop: 3 }} />
            <Text variant="caption" color="tertiary" style={{ flex: 1 }}>
              Reaching a limit pauses new AI requests until it resets. Your goals, tasks,
              habits and plans stay exactly where they are.
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
