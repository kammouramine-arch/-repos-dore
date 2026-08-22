import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { CalendarEvent } from '@/types/database';

export async function fetchEventsInRange(fromDate: string, toDate: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('starts_at', `${fromDate}T00:00:00`)
    .lte('starts_at', `${toDate}T23:59:59`)
    .order('starts_at');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createEvent(input: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const { data, error } = await supabase.from('calendar_events').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw toAppError(error);
}
