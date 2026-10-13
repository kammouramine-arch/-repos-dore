import {
  handsFreeReducer,
  initialHandsFreeState,
  type HandsFreeEvent,
  type HandsFreeState,
} from './handsFreeSession';

const send = (state: HandsFreeState, event: HandsFreeEvent) =>
  handsFreeReducer(state, event);

describe('hands-free microphone handoff contract', () => {
  it('releases the detector before opening the command recognizer', () => {
    const start = send(initialHandsFreeState, { type: 'enable' });
    expect(start.effects).toEqual(['start-detector']);
    const listening = send(start.state, { type: 'detector-opened' });
    expect(listening.state.phase).toBe('wake-listening');
    const fired = send(listening.state, { type: 'wake-detected' });
    expect(fired.effects).toEqual(['stop-detector']);
    expect(fired.effects).not.toContain('start-command');
    const released = send(fired.state, { type: 'detector-released' });
    expect(released.effects).toEqual(['start-command']);
  });

  it('never starts a second recognizer for duplicate detections', () => {
    let state = send(initialHandsFreeState, { type: 'enable' }).state;
    state = send(state, { type: 'detector-opened' }).state;
    state = send(state, { type: 'wake-detected' }).state;
    expect(send(state, { type: 'wake-detected' }).effects).toEqual([]);
  });

  it('waits for command microphone release before processing', () => {
    let state = send(initialHandsFreeState, { type: 'enable' }).state;
    for (const type of [
      'detector-opened',
      'wake-detected',
      'detector-released',
      'command-opened',
    ] as const) {
      state = send(state, { type }).state;
    }
    const captured = send(state, { type: 'command-captured' });
    expect(captured.effects).toEqual(['stop-command']);
    expect(captured.effects).not.toContain('perform-command');
    const released = send(captured.state, { type: 'command-released' });
    expect(released.effects).toEqual(['perform-command']);
    expect(released.state.phase).toBe('processing');
    expect(send(released.state, { type: 'turn-complete' }).effects).toEqual([
      'start-detector',
    ]);
  });

  it('does not start the mic after disable or background', () => {
    const opening = send(initialHandsFreeState, { type: 'enable' });
    const disabled = send(opening.state, { type: 'disable' });
    expect(disabled.effects).toEqual(['stop-detector']);
    expect(send(disabled.state, { type: 'detector-opened' }).effects).toEqual([
      'stop-detector',
    ]);
    expect(send(disabled.state, { type: 'app-foregrounded' }).effects).toEqual([]);
    const paused = send(opening.state, { type: 'app-backgrounded' });
    expect(paused.effects).toEqual(['stop-detector']);
    expect(send(paused.state, { type: 'app-foregrounded' }).effects).toEqual([
      'start-detector',
    ]);
  });

  it('never starts detector and command recognizer in the same transition', () => {
    const events: HandsFreeEvent[] = [
      { type: 'enable' },
      { type: 'detector-opened' },
      { type: 'wake-detected' },
      { type: 'detector-released' },
      { type: 'command-opened' },
      { type: 'command-captured' },
      { type: 'command-released' },
      { type: 'turn-complete' },
      { type: 'app-backgrounded' },
      { type: 'app-foregrounded' },
      { type: 'disable' },
      { type: 'unavailable' },
    ];
    let states = [initialHandsFreeState];
    for (let step = 0; step < 4; step += 1) {
      const nextStates: HandsFreeState[] = [];
      for (const state of states) {
        for (const event of events) {
          const next = send(state, event);
          expect(
            next.effects.includes('start-detector') &&
              next.effects.includes('start-command'),
          ).toBe(false);
          nextStates.push(next.state);
        }
      }
      states = nextStates.slice(0, 256);
    }
  });
});
