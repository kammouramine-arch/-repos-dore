import AsyncStorage from '@react-native-async-storage/async-storage';
import { brand } from '@/config/brand';

/**
 * Offline write queue. Mutations made without a connection are appended here and
 * replayed in order when connectivity returns. Each entry carries the timestamp of
 * the user's intent so a server row that changed later wins the conflict.
 */
export type OutboxKind =
  | 'task.complete'
  | 'task.reopen'
  | 'task.create'
  | 'task.reschedule'
  | 'habit.log';

export type OutboxEntry = {
  id: string;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  /** When the user performed the action, not when it is replayed. */
  intentAt: string;
  attempts: number;
};

const KEY = `${brand.storageNamespace}.outbox.v1`;

export async function readOutbox(): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(entries: OutboxEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
}

export async function enqueue(
  kind: OutboxKind,
  payload: Record<string, unknown>,
  id: string = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): Promise<OutboxEntry> {
  const entries = await readOutbox();
  const entry: OutboxEntry = { id, kind, payload, intentAt: new Date().toISOString(), attempts: 0 };
  // Collapse repeated intents for the same entity: the last one wins.
  const deduped = entries.filter(
    (e) => !(e.kind === kind && e.payload.id && e.payload.id === payload.id),
  );
  await writeOutbox([...deduped, entry]);
  return entry;
}

export async function remove(id: string): Promise<void> {
  const entries = await readOutbox();
  await writeOutbox(entries.filter((e) => e.id !== id));
}

export async function markAttempt(id: string): Promise<void> {
  const entries = await readOutbox();
  await writeOutbox(entries.map((e) => (e.id === id ? { ...e, attempts: e.attempts + 1 } : e)));
}

export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** After 6 failed replays an entry is dropped so the queue cannot wedge forever. */
export const MAX_ATTEMPTS = 6;

/**
 * Replays the queue with the supplied executor. Returns what happened so the caller
 * can tell the user honestly — nothing is silently discarded except exhausted entries.
 */
export async function flushOutbox(
  execute: (entry: OutboxEntry) => Promise<void>,
): Promise<{ synced: number; failed: number; dropped: number }> {
  const entries = await readOutbox();
  let synced = 0;
  let failed = 0;
  let dropped = 0;

  for (const entry of entries) {
    try {
      await execute(entry);
      await remove(entry.id);
      synced += 1;
    } catch {
      if (entry.attempts + 1 >= MAX_ATTEMPTS) {
        await remove(entry.id);
        dropped += 1;
      } else {
        await markAttempt(entry.id);
        failed += 1;
      }
    }
  }

  return { synced, failed, dropped };
}
