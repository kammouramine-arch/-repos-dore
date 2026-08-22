import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, areaPalette } from '@/theme';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  ProgressBar,
  ProgressRing,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  Text,
} from '@/components/ui';
import { useAreaActions, useAreas, useLifePlan, useLifeProgress, useReflections } from '@/hooks/useLife';
import { useHabits } from '@/hooks/useHabits';
import { useProjects } from '@/hooks/useProjects';
import { useEntitlements } from '@/hooks/useEntitlements';
import { friendlyDate } from '@/utils/date';
import type { LifeAreaKey } from '@/types/database';

const AREA_OPTIONS: { key: LifeAreaKey; name: string }[] = [
  { key: 'health', name: 'Health' },
  { key: 'career', name: 'Career' },
  { key: 'money', name: 'Money' },
  { key: 'relationships', name: 'Relationships' },
  { key: 'family', name: 'Family' },
  { key: 'growth', name: 'Personal growth' },
  { key: 'learning', name: 'Learning' },
  { key: 'business', name: 'Business' },
  { key: 'social', name: 'Social life' },
  { key: 'travel', name: 'Travel' },
  { key: 'hobbies', name: 'Hobbies' },
  { key: 'other', name: 'Something else' },
];

/** The Life Map: how each part of your life is actually going, and the long view. */
export default function Life() {
  const theme = useTheme();
  const router = useRouter();
  const areas = useAreas();
  const progress = useLifeProgress();
  const habits = useHabits();
  const projects = useProjects('active');
  const lifePlan = useLifePlan();
  const reflections = useReflections(5);
  const entitlements = useEntitlements();
  const ninetyDay = entitlements.canRun('ninety_day');
  const areaActions = useAreaActions();

  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState<LifeAreaKey>('health');
  const [newName, setNewName] = useState('');

  const rows = progress.data ?? [];
  const overall = useMemo(
    () => (rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.score), 0) / rows.length) : 0),
    [rows],
  );

  return (
    <Screen
      refreshing={progress.isRefetching}
      onRefresh={() => {
        void progress.refetch();
        void areas.refetch();
      }}
    >
      <View style={{ gap: theme.spacing.xl }}>
        <Text variant="title1">Life</Text>

        {/* -------------------------------------------------------- progress */}
        <Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}>
            <ProgressRing progress={overall} size={78} thickness={8} caption="Life progress" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="title3">Life progress</Text>
              <Text variant="footnote" color="secondary">
                {rows.length === 0
                  ? 'Once you have goals and habits, this reflects how they are actually going.'
                  : 'Blended from your goal progress, habit consistency and what you finish.'}
              </Text>
            </View>
          </View>

          {progress.isLoading && !progress.data ? (
            <View style={{ gap: 10, marginTop: theme.spacing.base }}>
              <Skeleton height={12} />
              <Skeleton height={12} />
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              {rows.map((row) => (
                <Pressable
                  key={row.life_area_id}
                  onPress={() => router.push(`/area/${row.life_area_id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.name}, ${Math.round(Number(row.score))} percent`}
                  style={{ gap: 6 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="subhead">{row.name}</Text>
                    <Text variant="subhead" color="secondary">
                      {Math.round(Number(row.score))}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={Number(row.score)}
                    color={areaPalette[row.area_key]?.[theme.scheme] ?? theme.colors.accent}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {/* ------------------------------------------------------- 90-day plan */}
        <View>
          <SectionHeader title="The long view" />
          {lifePlan.data ? (
            <Card onPress={() => router.push('/ninety-day')}>
              <Text variant="overline" color="accent">
                90-DAY PLAN
              </Text>
              <Text variant="title3" style={{ marginTop: 6 }}>
                {lifePlan.data.title}
              </Text>
              <Text variant="callout" color="secondary" numberOfLines={3} style={{ marginTop: 6 }}>
                {lifePlan.data.vision}
              </Text>
              <Text variant="caption" color="tertiary" style={{ marginTop: 10 }}>
                {friendlyDate(lifePlan.data.start_date)} → {friendlyDate(lifePlan.data.end_date)}
              </Text>
            </Card>
          ) : (
            <Card tone="accent" elevated={false}>
              <Text variant="title3">Where do you want to be in 90 days?</Text>
              <Text variant="footnote" color="secondary" style={{ marginTop: 6 }}>
                {ninetyDay.allowed
                  ? 'Three months, broken into weeks and first actions — built from what you have already told me.'
                  : `90-day planning is part of ${ninetyDay.upgradeTo?.name ?? 'a higher plan'}.`}
              </Text>
              <Button
                label={
                  ninetyDay.allowed
                    ? 'Build my 90-day plan'
                    : ninetyDay.upgradeTo
                      ? `See ${ninetyDay.upgradeTo.name}`
                      : 'See plans'
                }
                size="sm"
                style={{ marginTop: 12 }}
                onPress={() =>
                  ninetyDay.allowed
                    ? router.push('/(tabs)/talk?mode=ninety_day')
                    : router.push('/paywall')
                }
              />
            </Card>
          )}
        </View>

        {/* ------------------------------------------------ habits & projects */}
        <View style={{ gap: theme.spacing.md }}>
          <NavCard
            icon="repeat"
            title="Habits"
            caption={
              (habits.data?.length ?? 0) === 0
                ? 'Want to build a routine?'
                : `${habits.data?.length} running`
            }
            onPress={() => router.push('/habits')}
          />
          <NavCard
            icon="folder"
            title="Projects"
            caption={
              (projects.data?.length ?? 0) === 0
                ? 'What are you working toward?'
                : `${projects.data?.length} active`
            }
            onPress={() => router.push('/projects')}
          />
          <NavCard
            icon="zap"
            title="Agents"
            caption={
              entitlements.can('AI_AGENTS')
                ? 'Let your AI do the work'
                : `Part of ${entitlements.upgradeForCapability('AI_AGENTS')?.name ?? 'Ultra'}`
            }
            onPress={() => router.push('/agents')}
          />
          <NavCard
            icon="activity"
            title="Insights & deep analysis"
            caption="What your plan is telling you"
            onPress={() => router.push('/analysis')}
          />
          <NavCard
            icon="book-open"
            title="Reflections"
            caption={
              (reflections.data?.length ?? 0) === 0
                ? 'Nothing written down yet'
                : `Last one ${friendlyDate(reflections.data![0].date)}`
            }
            onPress={() => router.push('/reflections')}
          />
        </View>

        {/* ------------------------------------------------------ life areas */}
        <View>
          <SectionHeader
            title="Life map"
            caption="The parts of your life this app plans around"
            action="Add"
            onAction={() => {
              const taken = new Set((areas.data ?? []).map((a) => a.key));
              const next = AREA_OPTIONS.find((o) => !taken.has(o.key)) ?? AREA_OPTIONS[0];
              setNewKey(next.key);
              setNewName(next.name);
              setAdding(true);
            }}
          />
          {(areas.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon="compass"
              title="Your life map is empty."
              body="Talk to your planner and it will map the parts of your life that matter."
              actionLabel="Start"
              onAction={() => router.push('/(tabs)/talk')}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {(areas.data ?? []).map((area) => (
                <Pressable
                  key={area.id}
                  onPress={() => router.push(`/area/${area.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={area.name}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderLeftWidth: 3,
                    borderLeftColor: areaPalette[area.key]?.[theme.scheme] ?? theme.colors.accent,
                  }}
                >
                  <Text variant="subhead">{area.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ------------------------------------------------------ life reset */}
        <Card tone="alt" elevated={false}>
          <Text variant="title3">Life Reset</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 6 }}>
            When the plan no longer matches your life, start from the beginning: what is
            wrong, what you want instead, and a plan built around that.
          </Text>
          <Button
            label="Start a Life Reset"
            variant="secondary"
            size="sm"
            style={{ marginTop: 12 }}
            onPress={() => router.push('/life-reset')}
          />
        </Card>
      </View>

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add a life area">
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="subhead" color="secondary">
            What part of your life is this?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {AREA_OPTIONS.filter(
              (option) => !(areas.data ?? []).some((a) => a.key === option.key),
            ).map((option) => (
              <Chip
                key={option.key}
                label={option.name}
                small
                selected={newKey === option.key}
                onPress={() => {
                  setNewKey(option.key);
                  setNewName(option.name);
                }}
              />
            ))}
          </View>
        </View>

        <Field label="Call it" value={newName} onChangeText={setNewName} placeholder="Health" />

        <Button
          label="Add to my Life Map"
          full
          loading={areaActions.create.isPending}
          onPress={async () => {
            if (newName.trim().length < 2) return;
            await areaActions.create.mutateAsync({
              key: newKey,
              name: newName.trim(),
              sort_order: (areas.data?.length ?? 0) + 1,
            });
            setAdding(false);
          }}
        />
        <Text variant="caption" color="tertiary" align="center">
          Your planner will start using it for goals, habits and time in that part of your life.
        </Text>
      </Sheet>
    </Screen>
  );
}

function NavCard({
  icon,
  title,
  caption,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  caption: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Feather name={icon} size={16} color={theme.colors.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="footnote" color="tertiary">
            {caption}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.colors.textTertiary} />
      </View>
    </Card>
  );
}
