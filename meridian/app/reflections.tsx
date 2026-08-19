import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { useReflections } from '@/hooks/useLife';
import { friendlyDate } from '@/utils/date';

const KIND_LABEL: Record<string, string> = {
  daily_reset: 'Daily reset',
  weekly_review: 'Weekly review',
  journal: 'Journal',
  life_reset: 'Life reset',
};

export default function Reflections() {
  const theme = useTheme();
  const router = useRouter();
  const reflections = useReflections(50);

  return (
    <Screen refreshing={reflections.isRefetching} onRefresh={() => void reflections.refetch()}>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <Text variant="title1">Reflections</Text>

        {(reflections.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="book-open"
            title="Nothing written down yet."
            body="The daily reset turns a two-minute conversation into a record you can look back on."
            actionLabel="Start a daily reset"
            onAction={() => router.push('/daily-reset')}
          />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {(reflections.data ?? []).map((reflection) => (
              <Card key={reflection.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="overline" color="tertiary">
                    {(KIND_LABEL[reflection.kind] ?? reflection.kind).toUpperCase()}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {friendlyDate(reflection.date)}
                  </Text>
                </View>

                {reflection.raw_text ? (
                  <Text variant="body" style={{ marginTop: 10 }}>
                    {reflection.raw_text}
                  </Text>
                ) : null}

                {(reflection.wins ?? []).length > 0 ? (
                  <View style={{ marginTop: 12, gap: 4 }}>
                    <Text variant="caption" color="success">
                      WINS
                    </Text>
                    {(reflection.wins ?? []).map((win, index) => (
                      <Text key={`${win}-${index}`} variant="callout" color="secondary">
                        · {win}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {(reflection.obstacles ?? []).length > 0 ? (
                  <View style={{ marginTop: 10, gap: 4 }}>
                    <Text variant="caption" color="tertiary">
                      GOT IN THE WAY
                    </Text>
                    {(reflection.obstacles ?? []).map((obstacle, index) => (
                      <Text key={`${obstacle}-${index}`} variant="callout" color="secondary">
                        · {obstacle}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        )}

        <Button label="New reflection" full variant="secondary" onPress={() => router.push('/daily-reset')} />
      </View>
    </Screen>
  );
}
