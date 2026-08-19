import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Banner, Button, Chip, Field, Sheet, Text } from '@/components/ui';
import { OptionField, TimeField } from './fields';
import type { Habit, LifeArea } from '@/types/database';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HabitSheet({
  visible,
  onClose,
  habit,
  areas,
  onSave,
  onDelete,
  saving,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  habit?: Habit | null;
  areas: LifeArea[];
  onSave: (patch: Partial<Habit>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<Habit['cadence']>('daily');
  const [target, setTarget] = useState(7);
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(20);
  const [areaId, setAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(habit?.title ?? '');
    setCadence(habit?.cadence ?? 'daily');
    setTarget(habit?.target_per_week ?? 7);
    setDays(habit?.days_of_week ?? []);
    setTime(habit?.preferred_time ? habit.preferred_time.slice(0, 5) : null);
    setDuration(habit?.duration_minutes ?? 20);
    setAreaId(habit?.life_area_id ?? null);
  }, [visible, habit]);

  const valid = title.trim().length >= 2;

  return (
    <Sheet visible={visible} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      {error ? <Banner tone="danger" title="That did not save" body={error} /> : null}

      <Field
        label="The habit"
        value={title}
        onChangeText={setTitle}
        placeholder="Read before bed"
        autoFocus={!habit}
      />

      <OptionField
        label="How often"
        value={cadence}
        options={[
          { value: 'daily' as const, label: 'Every day' },
          { value: 'weekly' as const, label: 'A few times a week' },
          { value: 'custom' as const, label: 'Specific days' },
        ]}
        onChange={(next) => {
          setCadence(next);
          if (next === 'daily') setTarget(7);
          if (next === 'weekly') setTarget(3);
        }}
      />

      {cadence === 'weekly' ? (
        <OptionField
          label="Times per week"
          value={String(target)}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}×` }))}
          onChange={(v) => setTarget(Number(v))}
        />
      ) : null}

      {cadence === 'custom' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="subhead" color="secondary">
            Which days
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {DAY_LABELS.map((label, index) => (
              <Chip
                key={index}
                label={label}
                small
                selected={days.includes(index)}
                onPress={() =>
                  setDays((prev) => {
                    const next = prev.includes(index)
                      ? prev.filter((d) => d !== index)
                      : [...prev, index];
                    setTarget(Math.max(1, next.length));
                    return next;
                  })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      <TimeField label="Usual time" value={time} onChange={setTime} />

      <OptionField
        label="How long"
        value={String(duration)}
        options={[
          { value: '10', label: '10m' },
          { value: '20', label: '20m' },
          { value: '30', label: '30m' },
          { value: '60', label: '1h' },
        ]}
        onChange={(v) => setDuration(Number(v))}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="subhead" color="secondary">
          Part of your life
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {areas.map((area) => (
            <Chip
              key={area.id}
              label={area.name}
              small
              selected={areaId === area.id}
              onPress={() => setAreaId(areaId === area.id ? null : area.id)}
            />
          ))}
        </View>
      </View>

      <Button
        label={habit ? 'Save habit' : 'Start habit'}
        full
        loading={saving}
        onPress={async () => {
          if (!valid) return;
          await onSave({
            title: title.trim(),
            cadence,
            target_per_week: cadence === 'daily' ? 7 : target,
            days_of_week: cadence === 'custom' ? days : null,
            preferred_time: time,
            duration_minutes: duration,
            life_area_id: areaId,
          });
        }}
      />
      {habit && onDelete ? (
        <Button label="Delete habit" variant="danger" full onPress={() => onDelete()} />
      ) : null}
      <Text variant="caption" color="tertiary" align="center">
        Missing a day is information, not failure. Nothing here resets to zero.
      </Text>
    </Sheet>
  );
}
