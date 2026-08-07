import { CONVERSATION } from '@/config';
import {
  initialVoiceSessionState,
  retryDelayMs,
  voiceSessionReducer,
  VOICE_MESSAGES,
  type VoiceSessionEffect,
  type VoiceSessionEvent,
  type VoiceSessionState,
} from './voiceSession';

/** Runs a script of events, returning the state and everything it asked for. */
const run = (
  events: VoiceSessionEvent[],
  from: VoiceSessionState = initialVoiceSessionState,
) =>
  events.reduce(
    (acc, event) => {
      const { state, effects } = voiceSessionReducer(acc.state, event);
      return { state, effects: [...acc.effects, ...effects] };
    },
    { state: from, effects: [] as VoiceSessionEffect[] },
  );

const kinds = (effects: VoiceSessionEffect[]) => effects.map((effect) => effect.type);

const opens = (effects: VoiceSessionEffect[]) =>
  effects.filter((effect) => effect.type === 'open-session');

/** The happy path, up to and including an open microphone. */
const listening = (onDevice = true) =>
  run([
    { type: 'enabled' },
    { type: 'availability', available: true, onDevice },
    { type: 'permission', granted: true, canAskAgain: true },
    { type: 'opened' },
  ]);

describe('asking before listening', () => {
  it('checks what the device can do before anything else', () => {
    const { state, effects } = run([{ type: 'enabled' }]);

    expect(state.status).toBe('preparing');
    expect(kinds(effects)).toEqual(['check-availability']);
  });

  it('never opens the microphone before permission is granted', () => {
    // The defect that shipped in Build 8: start() was called with no
    // authorization, iOS answered `not-allowed`, and nothing said so.
    const { effects } = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
    ]);

    expect(opens(effects)).toHaveLength(0);
    expect(kinds(effects)).toEqual(['check-availability', 'request-permission']);
  });

  it('opens the microphone once permission is granted', () => {
    const { state, effects } = listening();

    expect(state.status).toBe('listening');
    expect(state.open).toBe(true);
    expect(opens(effects)).toHaveLength(1);
  });

  it('asks only for the microphone when recognition runs on the device', () => {
    // Requesting the speech authorization too would be a second dialog for a
    // capability this session has already decided not to use.
    const { effects } = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
    ]);

    expect(effects).toContainEqual({
      type: 'request-permission',
      networkRecognition: false,
    });
  });

  it('asks for both when it has to fall back to network recognition', () => {
    const { effects } = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: false },
    ]);

    expect(effects).toContainEqual({
      type: 'request-permission',
      networkRecognition: true,
    });
  });

  it('carries the on-device decision through to the session it opens', () => {
    const { effects } = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: true, canAskAgain: true },
    ]);

    expect(opens(effects)).toEqual([{ type: 'open-session', onDevice: true }]);
  });
});

describe('when the driver says no', () => {
  it('says so, and does not open the microphone', () => {
    const { state, effects } = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: false, canAskAgain: true },
    ]);

    expect(state.status).toBe('denied');
    expect(state.message).toBe(VOICE_MESSAGES.denied);
    expect(opens(effects)).toHaveLength(0);
  });

  it('points at the system settings once the platform will not ask again', () => {
    const { state } = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: false, canAskAgain: false },
    ]);

    expect(state.status).toBe('blocked');
    expect(state.message).toBe(VOICE_MESSAGES.blocked);
  });

  it('does not re-run the handshake and show the dialog twice', () => {
    const denied = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: false, canAskAgain: true },
    ]);

    const again = voiceSessionReducer(denied.state, { type: 'enabled' });

    expect(again.effects).toEqual([]);
    expect(again.state.status).toBe('denied');
  });
});

describe('when the device cannot do it at all', () => {
  it('says so rather than retrying forever', () => {
    const { state, effects } = run([
      { type: 'enabled' },
      { type: 'availability', available: false, onDevice: false },
    ]);

    expect(state.status).toBe('unsupported');
    expect(state.message).toBe(VOICE_MESSAGES.unsupported);
    expect(kinds(effects)).toEqual(['check-availability']);
  });
});

describe('one microphone, one session', () => {
  it('refuses to open a second session while one is open', () => {
    const open = listening();
    const again = voiceSessionReducer(open.state, { type: 'retry' });

    expect(opens(again.effects)).toHaveLength(0);
  });

  it('refuses to open a second session while one is on its way', () => {
    // `start()` is asynchronous. Between asking and being told, every other
    // path to the microphone has to be closed.
    const opening = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: true, canAskAgain: true },
    ]);

    expect(opening.state.opening).toBe(true);

    const again = voiceSessionReducer(opening.state, { type: 'retry' });
    expect(opens(again.effects)).toHaveLength(0);
  });

  it('does not keep a session that lands after the driver switched off', () => {
    const opening = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: true, canAskAgain: true },
      { type: 'disabled' },
    ]);

    const late = voiceSessionReducer(opening.state, { type: 'opened' });

    expect(late.state.open).toBe(false);
    expect(kinds(late.effects)).toEqual(['close-session']);
  });
});

describe('a session that ends', () => {
  it('reopens after a pause instead of staying dead', () => {
    // iOS caps a recognition task at about a minute. Before this, the wake
    // listener died there and never came back.
    const { state, effects } = voiceSessionReducer(listening().state, { type: 'ended' });

    expect(state.open).toBe(false);
    expect(effects).toEqual([
      { type: 'schedule-retry', delayMs: CONVERSATION.wakeRestartDelayMs },
    ]);
  });

  it('actually reopens when the retry comes due', () => {
    const ended = voiceSessionReducer(listening().state, { type: 'ended' });
    const retried = voiceSessionReducer(ended.state, { type: 'retry' });

    expect(opens(retried.effects)).toHaveLength(1);
  });

  it('does not reopen once voice commands are off', () => {
    const off = voiceSessionReducer(listening().state, { type: 'disabled' });
    const ended = voiceSessionReducer(off.state, { type: 'ended' });

    expect(ended.effects).toEqual([]);
    expect(ended.state.status).toBe('off');
  });
});

describe('a session that fails', () => {
  const failure = (code: string, fatal: boolean): VoiceSessionEvent => ({
    type: 'failed',
    error: { code, message: code, fatal },
  });

  it('backs off, and backs off further each time', () => {
    const first = voiceSessionReducer(listening().state, failure('network', false));
    expect(first.effects).toEqual([
      { type: 'schedule-retry', delayMs: retryDelayMs(1) },
    ]);

    const second = voiceSessionReducer(first.state, failure('network', false));
    const [retry] = second.effects;

    expect(retry).toEqual({ type: 'schedule-retry', delayMs: retryDelayMs(2) });
    expect(retryDelayMs(2)).toBeGreaterThan(retryDelayMs(1));
  });

  it('caps the backoff, so a broken recogniser costs no battery', () => {
    expect(retryDelayMs(50)).toBe(CONVERSATION.wakeRetryMaxMs);
  });

  it('tells the driver once failures stop looking like a blip', () => {
    let state = listening().state;
    for (let i = 0; i < CONVERSATION.wakeFailuresBeforeSurfacing; i += 1) {
      state = voiceSessionReducer(state, failure('network', false)).state;
    }

    expect(state.status).toBe('failed');
    expect(state.message).toBe(VOICE_MESSAGES.failed);
  });

  it('does not retry a permission failure, which would answer the same forever', () => {
    const { state, effects } = voiceSessionReducer(
      listening().state,
      failure('not-allowed', true),
    );

    expect(state.status).toBe('blocked');
    expect(kinds(effects)).not.toContain('schedule-retry');
  });

  it('does not retry a language the recogniser does not have', () => {
    const { state } = voiceSessionReducer(
      listening().state,
      failure('language-not-supported', true),
    );

    expect(state.status).toBe('unsupported');
  });

  it('forgets past failures once a session opens cleanly', () => {
    const failed = voiceSessionReducer(listening().state, failure('network', false));
    const recovered = voiceSessionReducer(failed.state, { type: 'opened' });

    expect(recovered.state.failures).toBe(0);
    expect(recovered.state.message).toBeNull();
  });
});

describe('a turn owns the microphone', () => {
  it('closes the wake listener while the driver is being answered', () => {
    // This is what stops Avyro hearing itself: the wake listener is not open
    // while Avyro is listening to a command or speaking a reply.
    const { state, effects } = voiceSessionReducer(listening().state, {
      type: 'turn-started',
    });

    expect(state.status).toBe('suspended');
    expect(state.open).toBe(false);
    expect(kinds(effects)).toEqual(['close-session']);
  });

  it('reopens when the turn is over', () => {
    const suspended = voiceSessionReducer(listening().state, { type: 'turn-started' });
    const resumed = voiceSessionReducer(suspended.state, { type: 'turn-ended' });

    expect(resumed.state.status).toBe('listening');
    expect(opens(resumed.effects)).toHaveLength(1);
  });

  it('will not open mid-turn, however the handshake finishes', () => {
    // Permission can be granted while a turn is running. The microphone still
    // belongs to the turn until it ends.
    const midTurn = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'turn-started' },
      { type: 'permission', granted: true, canAskAgain: true },
    ]);

    expect(opens(midTurn.effects)).toHaveLength(0);
  });

  it('does not resume a microphone the driver never asked for', () => {
    const off = run([{ type: 'turn-started' }, { type: 'turn-ended' }]);

    expect(off.state.status).toBe('off');
    expect(opens(off.effects)).toHaveLength(0);
  });
});

describe('switching voice commands off', () => {
  it('releases the microphone from every state', () => {
    const { state, effects } = voiceSessionReducer(listening().state, {
      type: 'disabled',
    });

    expect(state).toEqual(initialVoiceSessionState);
    expect(kinds(effects)).toEqual(['close-session']);
  });

  it('releases a session that has not finished opening', () => {
    const opening = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: true, canAskAgain: true },
    ]);

    const off = voiceSessionReducer(opening.state, { type: 'disabled' });
    expect(kinds(off.effects)).toEqual(['close-session']);
  });

  it('clears a refusal, so turning it on again asks properly', () => {
    const denied = run([
      { type: 'enabled' },
      { type: 'availability', available: true, onDevice: true },
      { type: 'permission', granted: false, canAskAgain: true },
    ]);

    const off = voiceSessionReducer(denied.state, { type: 'disabled' });
    expect(off.state.message).toBeNull();

    const on = voiceSessionReducer(off.state, { type: 'enabled' });
    expect(kinds(on.effects)).toEqual(['check-availability']);
  });
});
