import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Button, Card, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { LimitReached } from '@/components/LimitReached';
import { useConversation } from '@/hooks/useConversation';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useReports } from '@/hooks/useReports';
import { useInsights } from '@/hooks/useInsights';
import { InsightCard } from '@/components/InsightCard';
import { track } from '@/services/analytics';
import { friendlyDate } from '@/utils/date';

/**
 * Deep Life Analysis.
 *
 * A slow, wide pass over everything — goals against their dates, habits over weeks, the
 * shape of the weeks, the contradiction between stated priorities and actual time. It
 * changes nothing; it is for seeing. The observations above it are computed on device
 * and are available on every plan.
 */
export default function Analysis() {
  const theme = useTheme();
  const router = useRouter();
  const entitlements = useEntitlements();
  const allowance = entitlements.canRun('deep_analysis');
  const reports = useReports('deep_analysis');
  const { insights, isLoading } = useInsights();
  const [running, setRunning] = useState(false);

  const conversation = useConversation({
    kind: 'planning',
    mode: 'deep_analysis',
    fresh: true,
    autoStart: running ? 'Run a deep analysis of my life right now.' : undefined,
  });

  if (running) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ConversationView
          messages={conversation.messages}
          thinking={conversation.thinking}
          error={conversation.error}
          onSend={conversation.send}
          onResolve={conversation.resolve}
          suggestions={conversation.suggestions}
          placeholder="Ask about anything it found…"
          header={
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: theme.spacing.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
                <View>
                  <Text variant="title3">Deep analysis</Text>
                  <Text variant="caption" color="tertiary">
                    {conversation.thinking ? 'Reading everything…' : 'Ask follow-ups'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setRunning(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={22} color={theme.colors.textTertiary} />
              </Pressable>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <Screen refreshing={reports.isRefetching} onRefresh={() => void reports.refetch()}>
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
            INSIGHTS
          </Text>
          <Text variant="display">What your plan is telling you.</Text>
        </View>

        {/* ------------------------------------------- on-device observations -- */}
        <View>
          <SectionHeader title="Noticed" caption="Read from your own data, on this device" />
          {isLoading ? (
            <Card>
              <Skeleton height={14} width="70%" />
              <Skeleton height={12} width="90%" style={{ marginTop: 10 }} />
            </Card>
          ) : insights.length === 0 ? (
            <Card>
              <Text variant="body" color="secondary">
                Nothing is drifting and nothing is overloaded. That is the good version of
                this screen.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {insights.map((insight) => (
                <InsightCard key={insight.fingerprint} insight={insight} />
              ))}
            </View>
          )}
        </View>

        {/* ------------------------------------------------- deep analysis ---- */}
        <View>
          <SectionHeader title="Deep analysis" />
          {allowance.allowed ? (
            <Card tone="accent" elevated={false}>
              <Text variant="title3">Have your AI read the whole file.</Text>
              <Text variant="footnote" color="secondary" style={{ marginTop: 6 }}>
                Goals against their dates, habits over weeks, where your time actually
                goes, and the one change with the most leverage. It changes nothing on its
                own — this pass is for seeing.
              </Text>
              <Button
                label="Run deep analysis"
                size="sm"
                style={{ marginTop: 12 }}
                onPress={() => {
                  track('deep_analysis_run');
                  setRunning(true);
                }}
              />
            </Card>
          ) : (
            <LimitReached
              kind={allowance.reason === 'quota_exceeded' ? 'quota_exceeded' : 'not_entitled'}
              message={
                allowance.reason === 'quota_exceeded'
                  ? 'You have used the advanced requests on your plan for this period.'
                  : 'Deep analysis reads far more of your history than a normal conversation, so it runs on the plans built for it.'
              }
              upgradeName={allowance.upgradeTo?.name}
              resetsAt={entitlements.resetsAt}
            />
          )}
        </View>

        {(reports.data?.length ?? 0) > 0 ? (
          <View>
            <SectionHeader title="Past analyses" />
            <Card>
              {(reports.data ?? []).map((report, index, all) => (
                <Pressable
                  key={report.id}
                  onPress={() => router.push(`/report/${report.id}`)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: index === all.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {friendlyDate(report.created_at.slice(0, 10))}
                  </Text>
                  <Feather name="chevron-right" size={16} color={theme.colors.textTertiary} />
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
