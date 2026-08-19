import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Banner, Button, Field, Sheet, Text } from '@/components/ui';
import { DateField, OptionField, TimeField } from './fields';
import type { Priority, Task } from '@/types/database';
import { todayISO } from '@/utils/date';

type Draft = {
  title: string;
  notes: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number;
  priority: Priority;
  is_focus: boolean;
};

const empty = (date: string): Draft => ({
  title: '',
  notes: '',
  scheduled_date: date,
  scheduled_time: null,
  duration_minutes: 30,
  priority: 'medium',
  is_focus: false,
});

/** Create or edit a task. Also the place a task gets moved or deleted from. */
export function TaskSheet({
  visible,
  onClose,
  task,
  defaultDate = todayISO(),
  onSave,
  onDelete,
  saving,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultDate?: string;
  onSave: (patch: Partial<Task>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<Draft>(empty(defaultDate));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTouched(false);
    setDraft(
      task
        ? {
            title: task.title,
            notes: task.notes ?? '',
            scheduled_date: task.scheduled_date,
            scheduled_time: task.scheduled_time ? task.scheduled_time.slice(0, 5) : null,
            duration_minutes: task.duration_minutes,
            priority: task.priority,
            is_focus: task.is_focus,
          }
        : empty(defaultDate),
    );
  }, [visible, task, defaultDate]);

  const valid = draft.title.trim().length >= 2;

  return (
    <Sheet visible={visible} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      {error ? <Banner tone="danger" title="That did not save" body={error} /> : null}

      <Field
        label="What needs doing"
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
        placeholder="Finish the business proposal"
        autoFocus={!task}
        error={touched && !valid ? 'Give it a name first.' : null}
        returnKeyType="done"
      />

      <DateField
        value={draft.scheduled_date}
        onChange={(scheduled_date) => setDraft((d) => ({ ...d, scheduled_date }))}
      />

      <TimeField
        value={draft.scheduled_time}
        onChange={(scheduled_time) => setDraft((d) => ({ ...d, scheduled_time }))}
      />

      <OptionField
        label="How long"
        value={String(draft.duration_minutes)}
        options={[
          { value: '15', label: '15m' },
          { value: '30', label: '30m' },
          { value: '60', label: '1h' },
          { value: '90', label: '1h 30' },
          { value: '120', label: '2h' },
        ]}
        onChange={(v) => setDraft((d) => ({ ...d, duration_minutes: Number(v) }))}
      />

      <OptionField
        label="Priority"
        value={draft.priority}
        options={[
          { value: 'low' as Priority, label: 'Low' },
          { value: 'medium' as Priority, label: 'Medium' },
          { value: 'high' as Priority, label: 'High' },
        ]}
        onChange={(priority) => setDraft((d) => ({ ...d, priority }))}
      />

      <OptionField
        label="One of today's few priorities?"
        value={draft.is_focus ? 'yes' : 'no'}
        options={[
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ]}
        onChange={(v) => setDraft((d) => ({ ...d, is_focus: v === 'yes' }))}
      />

      <Field
        label="Notes"
        value={draft.notes}
        onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
        placeholder="Anything you want to remember"
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        <Button
          label={task ? 'Save changes' : 'Add task'}
          full
          loading={saving}
          onPress={async () => {
            setTouched(true);
            if (!valid) return;
            await onSave({
              title: draft.title.trim(),
              notes: draft.notes.trim() || null,
              scheduled_date: draft.scheduled_date,
              scheduled_time: draft.scheduled_time,
              duration_minutes: draft.duration_minutes,
              priority: draft.priority,
              is_focus: draft.is_focus,
            });
          }}
        />
        {task && onDelete ? (
          <Button label="Delete task" variant="danger" full onPress={() => onDelete()} />
        ) : null}
        <Text variant="caption" color="tertiary" align="center">
          You can also just tell your planner: “move this to Thursday”.
        </Text>
      </View>
    </Sheet>
  );
}
