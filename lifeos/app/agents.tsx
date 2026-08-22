import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Button, Card, Screen, SectionHeader, Text } from '@/components/ui';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useReports } from '@/hooks/useReports';
import { AGENTS, AGENT_KEYS } from '@shared/agents';
import { friendlyDate } from '@/utils/date';
import { brand } from '@/config/brand';

/**
 * Agents.
 *
 * The same assistant, given a narrower brief and room to work: it reads widely, decides
 * what to change, and changes it — then writes a report. This is what Ultra buys, so
 * the gate is stated plainly rather than hidden behind a disabled button.
 */
export default function Agents() {
  const theme = useTheme();
  const router = useRouter();
  const entitlements = useEntitlements();
  const allowance = entitlements.canRun('agent_run');
  const reports = useReports('agent_run');

  const runs = entitlements.quota('agent_runs');

  return (
    <Screen refreshing={reports.isRefetching} onRefresh={() => void reports.refetch()}>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </Pressable>
          <AIOrb size={26} state="idle" />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" color="accent">
            AGENTS
          </Text>
          <Text variant="display">Let {brand.name} do the work.</Text>
          <Text variant="body" color="secondary">
            An agent reads your whole plan — goals, habits, projects, the weeks around
            you — decides what needs to change, and makes those changes. It reports back
            when it is done. Anything it cannot undo, it still asks about first.
          </Text>
        </View>

        {!allowance.allowed ? (
          <Banner
            tone="info"
            title={
              allowance.reason === 'quota_exceeded'
                ? `You have used the agent runs in ${entitlements.plan.name}`
                : `Agents are part of ${allowance.upgradeTo?.name ?? 'Ultra'}`
            }
            body={
              allowance.reason === 'quota_exceeded'
                ? `Your allowance resets ${entitlements.resetsAt ? friendlyDate(entitlements.resetsAt) : 'next period'}.`
                : 'Everything below is real and runs against your own plan — it just needs the plan that includes it.'
            }
            actionLabel={allowance.upgradeTo ? `See ${allowance.upgradeTo.name}` : 'See plans'}
            onAction={() => router.push('/paywall')}
          />
        ) : (
          <Card tone="accent" elevated={false}>
            <Text variant="subhead" color="accent">
              {runs.fairUse ? 'High limits · fair use' : `${runs.remaining} runs left this period`}
            </Text>
            <Text variant="footnote" color="secondary" style={{ marginTop: 4 }}>
              An agent run costs more than a conversation because it does more: it reads
              widely and works through many steps before it answers.
            </Text>
          </Card>
        )}

        <View style={{ gap: theme.spacing.md }}>
          {AGENT_KEYS.map((key) => {
            const agent = AGENTS[key];
            return (
              <Card
                key={key}
                onPress={() =>
                  allowance.allowed ? router.push(`/agent/${key}`) : router.push('/paywall')
                }
                accessibilityLabel={agent.name}
              >
                <View style={{ flexDirection: 'row', gap: theme.spacing.base, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: allowance.allowed
                        ? theme.colors.accentSoft
                        : theme.colors.surfaceAlt,
                    }}
                  >
                    <Feather
                      name={agent.icon as keyof typeof Feather.glyphMap}
                      size={17}
                      color={allowance.allowed ? theme.colors.accentText : theme.colors.textTertiary}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="title3">{agent.name}</Text>
                    <Text variant="callout" color="accent">
                      {agent.tagline}
                    </Text>
                    <Text variant="footnote" color="secondary" style={{ marginTop: 4 }}>
                      {agent.description}
                    </Text>
                  </View>
                  <Feather
                    name={allowance.allowed ? 'chevron-right' : 'lock'}
                    size={16}
                    color={theme.colors.textTertiary}
                    style={{ marginTop: 4 }}
                  />
                </View>
              </Card>
            );
          })}
        </View>

        {(reports.data?.length ?? 0) > 0 ? (
          <View>
            <SectionHeader title="Past runs" />
            <Card>
              {(reports.data ?? []).slice(0, 6).map((report, index, all) => (
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
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body" numberOfLines={1}>
                      {report.title}
                    </Text>
                    <Text variant="caption" color="tertiary">
                      {friendlyDate(report.created_at.slice(0, 10))} ·{' '}
                      {report.actions.filter((a) => a.status === 'succeeded').length} change
                      {report.actions.filter((a) => a.status === 'succeeded').length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.colors.textTertiary} />
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}

        {allowance.allowed ? null : (
          <Button label="See plans" full onPress={() => router.push('/paywall')} />
        )}
      </View>
    </Screen>
  );
}
