import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, areaPalette } from '@/theme';
import {
  Button,
  Card,
  EmptyState,
  ProgressBar,
  ProgressRing,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { useAreas, useLifePlan, useLifeProgress, useReflections } from '@/hooks/useLife';
import { useHabits } from '@/hooks/useHabits';
import { useProjects } from '@/hooks/useProjects';
import { useEntitlement } from '@/hooks/useEntitlement';
import { friendlyDate } from '@/utils/date';

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
  const entitlement = useEntitlement();

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
                {entitlement.can('ninety_day_plan')
                  ? 'Three months, broken into weeks and first actions — built from what you have already told me.'
                  : '90-day planning is part of Pro.'}
              </Text>
              <Button
                label={entitlement.can('ninety_day_plan') ? 'Build my 90-day plan' : 'See Pro'}
                size="sm"
                style={{ marginTop: 12 }}
                onPress={() =>
                  entitlement.can('ninety_day_plan')
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
          <SectionHeader title="Life map" caption="The parts of your life this app plans around" />
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
