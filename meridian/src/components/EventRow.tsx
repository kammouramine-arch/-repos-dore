import React from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { CalendarEvent } from '@/types/database';
import { formatClock } from '@/utils/date';

/** Events look different from tasks on purpose: they are commitments, not choices. */
export function EventRow({ event }: { event: CalendarEvent }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 }}>
      <View
        style={{
          width: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 3,
            height: 30,
            borderRadius: 2,
            backgroundColor: theme.colors.accent,
          }}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" numberOfLines={1}>
          {event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="caption" color="secondary">
            {formatClock(event.starts_at)} – {formatClock(event.ends_at)}
          </Text>
          {event.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="map-pin" size={10} color={theme.colors.textTertiary} />
              <Text variant="caption" color="tertiary" numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
