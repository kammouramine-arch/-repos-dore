import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, EmptyState, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePreferences, useUpdatePreferences } from '@/hooks/useProfile';
import { deleteMemory, fetchMemory, forgetEverything } from '@/services/memory';

/**
 * What the assistant remembers, in plain language — every item viewable and deletable.
 * Memory can also be switched off entirely, in which case nothing new is stored.
 */
export default function MemorySettings() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const memory = useCachedQuery(['memory'], 'memory', fetchMemory);
  const preferences = usePreferences();
  const update = useUpdatePreferences();

  const remove = useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memory'] }),
  });

  const wipe = useMutation({
    mutationFn: forgetEverything,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Screen refreshing={memory.isRefetching} onRefresh={() => void memory.refetch()}>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">AI memory</Text>
        <Text variant="callout" color="secondary">
          Durable facts your planner keeps so it does not ask the same things twice.
          Delete anything here and it is gone.
        </Text>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          <Row
            icon="database"
            label="Memory enabled"
            toggle={preferences.data?.memory_enabled ?? true}
            onToggle={(memory_enabled) => update.mutate({ memory_enabled })}
            last
          />
        </Card>

        {(memory.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="database"
            title="Nothing remembered yet."
            body="As you talk, durable things — your working hours, commitments, what you are aiming at — get stored here."
          />
        ) : (
          <View>
            <SectionHeader title={`${memory.data?.length} memories`} />
            <Card>
              {(memory.data ?? []).map((item, index, all) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: index === all.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="overline" color="tertiary">
                      {item.kind.toUpperCase()}
                    </Text>
                    <Text variant="body">{item.value}</Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Forget this?', item.value, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Forget', style: 'destructive', onPress: () => remove.mutate(item.id) },
                      ])
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Forget ${item.value}`}
                  >
                    <Feather name="trash-2" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        )}

        <Button
          label="Delete all conversations and memory"
          variant="danger"
          full
          loading={wipe.isPending}
          onPress={() =>
            Alert.alert(
              'Delete everything the assistant knows?',
              'Conversations and memories are removed. Your goals, tasks and plans stay.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => wipe.mutate() },
              ],
            )
          }
        />
      </View>
    </Screen>
  );
}
