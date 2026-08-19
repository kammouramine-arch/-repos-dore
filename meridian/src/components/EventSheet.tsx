import React, { useEffect, useState } from 'react';
import { Banner, Button, Field, Sheet } from '@/components/ui';
import { DateField, TimeField } from './fields';
import type { CalendarEvent } from '@/types/database';
import { todayISO } from '@/utils/date';

export function EventSheet({
  visible,
  onClose,
  defaultDate = todayISO(),
  onSave,
  saving,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSave: (input: Partial<CalendarEvent>) => Promise<void> | void;
  saving?: boolean;
  error?: string | null;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(defaultDate);
  const [start, setStart] = useState<string | null>('09:00');
  const [end, setEnd] = useState<string | null>('10:00');
  const [location, setLocation] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDate(defaultDate);
    setStart('09:00');
    setEnd('10:00');
    setLocation('');
    setProblem(null);
  }, [visible, defaultDate]);

  return (
    <Sheet visible={visible} onClose={onClose} title="New event">
      {error || problem ? (
        <Banner tone="danger" title="That did not save" body={error ?? problem ?? ''} />
      ) : null}

      <Field label="What is it" value={title} onChangeText={setTitle} placeholder="Dentist" autoFocus />
      <DateField value={date} onChange={setDate} allowClear={false} />
      <TimeField label="Starts" value={start} onChange={setStart} />
      <TimeField label="Ends" value={end} onChange={setEnd} />
      <Field label="Where" value={location} onChangeText={setLocation} placeholder="Optional" />

      <Button
        label="Add event"
        full
        loading={saving}
        onPress={async () => {
          if (title.trim().length < 2 || !date || !start || !end) {
            setProblem('A title, a date and a time are needed.');
            return;
          }
          if (end <= start) {
            setProblem('The end time has to be after the start time.');
            return;
          }
          setProblem(null);
          await onSave({
            title: title.trim(),
            starts_at: `${date}T${start}:00`,
            ends_at: `${date}T${end}:00`,
            location: location.trim() || null,
          });
        }}
      />
    </Sheet>
  );
}
