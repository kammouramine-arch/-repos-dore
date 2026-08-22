import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_ATTEMPTS,
  clearOutbox,
  enqueue,
  flushOutbox,
  readOutbox,
  remove,
} from '@/lib/outbox';
import { clearAllCaches, readCache, writeCache } from '@/lib/cache';
import { brand } from '@/config/brand';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('outbox', () => {
  it('queues a change made offline', async () => {
    await enqueue('task.complete', { id: 'task-1' });
    const entries = await readOutbox();

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('task.complete');
    expect(entries[0].intentAt).toBeTruthy();
  });

  it('collapses repeated intents for the same entity so the last one wins', async () => {
    await enqueue('task.complete', { id: 'task-1' });
    await enqueue('task.complete', { id: 'task-1' });
    await enqueue('task.complete', { id: 'task-2' });

    const entries = await readOutbox();
    expect(entries).toHaveLength(2);
  });

  it('replays entries in order and clears them once accepted', async () => {
    await enqueue('task.complete', { id: 'a' });
    await enqueue('task.create', { title: 'b' });

    const replayed: string[] = [];
    const result = await flushOutbox(async (entry) => {
      replayed.push(entry.kind);
    });

    expect(replayed).toEqual(['task.complete', 'task.create']);
    expect(result.synced).toBe(2);
    expect(await readOutbox()).toHaveLength(0);
  });

  it('keeps a failed entry for a later attempt instead of losing the change', async () => {
    await enqueue('task.complete', { id: 'a' });

    const result = await flushOutbox(async () => {
      throw new Error('network request failed');
    });

    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
    const entries = await readOutbox();
    expect(entries).toHaveLength(1);
    expect(entries[0].attempts).toBe(1);
  });

  it('gives up on an entry that can never succeed, and says so', async () => {
    await enqueue('task.complete', { id: 'a' });

    let last = { synced: 0, failed: 0, dropped: 0 };
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      last = await flushOutbox(async () => {
        throw new Error('gone');
      });
    }

    expect(last.dropped).toBe(1);
    expect(await readOutbox()).toHaveLength(0);
  });

  it('can be emptied when a user signs out', async () => {
    await enqueue('habit.log', { habit_id: 'h', date: '2026-03-10' });
    await clearOutbox();
    expect(await readOutbox()).toHaveLength(0);
  });

  it('removes a single entry by id', async () => {
    const entry = await enqueue('task.reopen', { id: 'a' });
    await remove(entry.id);
    expect(await readOutbox()).toHaveLength(0);
  });
});

describe('offline cache', () => {
  it('round-trips values per user', async () => {
    await writeCache('user-a', 'today', [{ id: 1 }]);
    await writeCache('user-b', 'today', [{ id: 2 }]);

    expect(await readCache('user-a', 'today')).toEqual([{ id: 1 }]);
    expect(await readCache('user-b', 'today')).toEqual([{ id: 2 }]);
  });

  it('never returns another account’s data', async () => {
    await writeCache('user-a', 'goals', ['private']);
    expect(await readCache('user-b', 'goals')).toBeNull();
  });

  it('honours a max age so stale plans are not shown as current', async () => {
    await writeCache('user-a', 'today', ['old']);
    expect(await readCache('user-a', 'today', -1)).toBeNull();
  });

  it('is wiped on sign out', async () => {
    await writeCache('user-a', 'today', ['x']);
    await clearAllCaches();
    expect(await readCache('user-a', 'today')).toBeNull();
  });

  it('survives corrupted storage without crashing the app', async () => {
    await AsyncStorage.setItem(`${brand.storageNamespace}.cache.v1.user-a.today`, 'not json');
    expect(await readCache('user-a', 'today')).toBeNull();
  });
});
