import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Chip, Text } from '@/components/ui';
import { addDays, friendlyDate, fromISODate, toISODate } from '@/utils/date';

/** Date field: quick choices for the common cases, a real picker for the rest. */
export function DateField({
  label = 'When',
  value,
  onChange,
  allowClear = true,
}: {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  allowClear?: boolean;
}) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const today = new Date();

  const presets = [
    { label: 'Today', value: toISODate(today) },
    { label: 'Tomorrow', value: toISODate(addDays(today, 1)) },
    { label: 'Next week', value: toISODate(addDays(today, 7)) },
  ];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="subhead" color="secondary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {presets.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            small
            selected={value === p.value}
            onPress={() => onChange(p.value)}
          />
        ))}
        <Pressable
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Pick a date"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Feather name="calendar" size={11} color={theme.colors.textSecondary} />
            <Text variant="caption">
              {value && !presets.some((p) => p.value === value) ? friendlyDate(value) : 'Pick'}
            </Text>
          </View>
        </Pressable>
        {allowClear && value ? (
          <Chip label="No date" small onPress={() => onChange(null)} />
        ) : null}
      </View>

      {showPicker ? (
        <DateTimePicker
          value={value ? fromISODate(value) : today}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setShowPicker(false);
            if (event.type === 'set' && date) onChange(toISODate(date));
          }}
        />
      ) : null}
    </View>
  );
}

/** Optional time of day. A task without a time is a choice, not a commitment. */
export function TimeField({
  label = 'Time',
  value,
  onChange,
}: {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const asDate = () => {
    const base = new Date();
    if (value) {
      const [h, m] = value.split(':');
      base.setHours(Number(h ?? 9), Number(m ?? 0), 0, 0);
    } else {
      base.setMinutes(0, 0, 0);
    }
    return base;
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="subhead" color="secondary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <Chip
          label={value ? value.slice(0, 5) : 'Set a time'}
          small
          selected={Boolean(value)}
          icon="clock"
          onPress={() => setShowPicker(true)}
        />
        {value ? <Chip label="Any time" small onPress={() => onChange(null)} /> : null}
      </View>
      {showPicker ? (
        <DateTimePicker
          value={asDate()}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setShowPicker(false);
            if (event.type === 'set' && date) {
              onChange(
                `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
              );
            }
          }}
        />
      ) : null}
    </View>
  );
}

export function OptionField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="subhead" color="secondary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            small
            selected={value === o.value}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}
