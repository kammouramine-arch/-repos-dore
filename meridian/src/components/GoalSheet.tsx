import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Banner, Button, Chip, Field, Sheet, Text } from '@/components/ui';
import { DateField, OptionField } from './fields';
import type { Goal, LifeArea, Priority } from '@/types/database';

export function GoalSheet({
  visible,
  onClose,
  goal,
  areas,
  onSave,
  saving,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  goal?: Goal | null;
  areas: LifeArea[];
  onSave: (patch: Partial<Goal>) => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTouched(false);
    setTitle(goal?.title ?? '');
    setWhy(goal?.why ?? '');
    setAreaId(goal?.life_area_id ?? null);
    setTargetDate(goal?.target_date ?? null);
    setPriority(goal?.priority ?? 'medium');
  }, [visible, goal]);

  const valid = title.trim().length >= 2;

  return (
    <Sheet visible={visible} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      {error ? <Banner tone="danger" title="That did not save" body={error} /> : null}

      <Field
        label="What do you want to achieve"
        value={title}
        onChangeText={setTitle}
        placeholder="Save €10,000"
        autoFocus={!goal}
        error={touched && !valid ? 'Give the goal a name.' : null}
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

      <DateField label="Target date" value={targetDate} onChange={setTargetDate} />

      <OptionField
        label="Priority"
        value={priority}
        options={[
          { value: 'low' as Priority, label: 'Low' },
          { value: 'medium' as Priority, label: 'Medium' },
          { value: 'high' as Priority, label: 'High' },
        ]}
        onChange={setPriority}
      />

      <Field
        label="Why this matters"
        value={why}
        onChangeText={setWhy}
        placeholder="In your own words — it helps when motivation dips."
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      <Button
        label={goal ? 'Save goal' : 'Create goal'}
        full
        loading={saving}
        onPress={async () => {
          setTouched(true);
          if (!valid) return;
          await onSave({
            title: title.trim(),
            why: why.trim() || null,
            life_area_id: areaId,
            target_date: targetDate,
            priority,
          });
        }}
      />
      <Text variant="caption" color="tertiary" align="center">
        Ask your planner to build the strategy — it will break this into steps.
      </Text>
    </Sheet>
  );
}
