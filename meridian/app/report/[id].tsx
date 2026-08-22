import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, EmptyState, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useReportActions, useReports } from '@/hooks/useReports';
import { friendlyDate } from '@/utils/date';

/** A stored report: what a run concluded, and what it actually changed. */
export default function Report() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reports = useReports();
  const actions = useReportActions();

  const report = (reports.data ?? []).find((r) => r.id === id);

  if (reports.isLoading && !reports.data) {
    return (
      <Screen>
        <Skeleton height={26} width="60%" />
        <Skeleton height={14} width="90%" style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen>
        <EmptyState
          icon="file-text"
          title="That report is gone."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const changes = report.actions.filter((a) => a.status === 'succeeded');

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" color="accent">
            {report.kind === 'agent_run'
              ? 'AGENT RUN'
              : report.kind === 'deep_analysis'
                ? 'DEEP ANALYSIS'
                : 'WEEKLY REVIEW'}
          </Text>
          <Text variant="display">{report.title}</Text>
          <Text variant="caption" color="tertiary">
            {friendlyDate(report.created_at.slice(0, 10))}
          </Text>
        </View>

        <Card>
          <Text variant="body">{report.body}</Text>
        </Card>

        {changes.length > 0 ? (
          <View>
            <SectionHeader title={`${changes.length} change${changes.length === 1 ? '' : 's'} made`} />
            <Card>
              <View style={{ gap: 10 }}>
                {changes.map((change, index) => (
                  <View key={`${change.tool}-${index}`} style={{ flexDirection: 'row', gap: 10 }}>
                    <Feather name="check" size={13} color={theme.colors.success} style={{ marginTop: 3 }} />
                    <Text variant="callout" color="secondary" style={{ flex: 1 }}>
                      {change.summary}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        <Button
          label="Delete this report"
          variant="danger"
          full
          onPress={() =>
            Alert.alert('Delete this report?', 'The changes it made stay in your plan.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await actions.remove.mutateAsync(report.id);
                  router.back();
                },
              },
            ])
          }
        />
      </View>
    </Screen>
  );
}
