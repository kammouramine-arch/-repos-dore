/**
 * Pure coordinator for the ownership of the microphone.
 *
 * An actual, licensed native keyword spotter will implement WakeWordDetector.
 * Nothing in this file listens to the microphone. This deliberately separates
 * policy (safe handoff) from the eventual iOS implementation.
 */
export type HandsFreePhase =
  | 'off'
  | 'starting-detector'
  | 'wake-listening'
  | 'stopping-detector'
  | 'starting-command'
  | 'command-listening'
  | 'stopping-command'
  | 'processing'
  | 'suspended'
  | 'unavailable';

export interface HandsFreeState {
  phase: HandsFreePhase;
  enabled: boolean;
}

export type HandsFreeEvent =
  | { type: 'enable' }
  | { type: 'disable' }
  | { type: 'app-backgrounded' }
  | { type: 'app-foregrounded' }
  | { type: 'detector-opened' }
  | { type: 'wake-detected' }
  | { type: 'detector-released' }
  | { type: 'command-opened' }
  | { type: 'command-captured' }
  | { type: 'command-released' }
  | { type: 'turn-complete' }
  | { type: 'unavailable' };

export type HandsFreeEffect =
  | 'start-detector'
  | 'stop-detector'
  | 'start-command'
  | 'stop-command'
  | 'perform-command';

export interface HandsFreeTransition {
  state: HandsFreeState;
  effects: HandsFreeEffect[];
}

export const initialHandsFreeState: HandsFreeState = {
  phase: 'off',
  enabled: false,
};

const unchanged = (state: HandsFreeState): HandsFreeTransition => ({
  state,
  effects: [],
});

const transition = (
  state: HandsFreeState,
  phase: HandsFreePhase,
  effects: HandsFreeEffect[] = [],
): HandsFreeTransition => ({ state: { ...state, phase }, effects });

/**
 * Invariants:
 * - start-command is emitted only after detector-released.
 * - start-detector is emitted only after turn-complete (or fresh enable).
 * - neither native audio consumer can be started while the other is open.
 * - no AI action runs before the command microphone has been released.
 * - disabling never triggers either microphone to restart.
 *
 * The runtime must await native stop() before dispatching *-released events.
 */
export const handsFreeReducer = (
  state: HandsFreeState,
  event: HandsFreeEvent,
): HandsFreeTransition => {
  if (event.type === 'disable') {
    const effects: HandsFreeEffect[] =
      state.phase === 'starting-command' ||
      state.phase === 'command-listening' ||
      state.phase === 'stopping-command'
        ? ['stop-command']
        : state.phase === 'starting-detector' ||
            state.phase === 'wake-listening' ||
            state.phase === 'stopping-detector'
          ? ['stop-detector']
          : [];
    return { state: initialHandsFreeState, effects };
  }

  if (event.type === 'app-backgrounded') {
    const effects: HandsFreeEffect[] =
      state.phase === 'starting-command' ||
      state.phase === 'command-listening' ||
      state.phase === 'stopping-command'
        ? ['stop-command']
        : state.phase === 'starting-detector' ||
            state.phase === 'wake-listening' ||
            state.phase === 'stopping-detector'
          ? ['stop-detector']
          : [];
    return { state: { ...state, phase: 'suspended' }, effects };
  }

  if (event.type === 'unavailable') {
    return { state: { ...state, phase: 'unavailable' }, effects: [] };
  }

  switch (event.type) {
    case 'enable':
      if (state.enabled) return unchanged(state);
      return {
        state: { enabled: true, phase: 'starting-detector' },
        effects: ['start-detector'],
      };

    case 'app-foregrounded':
      if (!state.enabled || state.phase !== 'suspended') return unchanged(state);
      return transition(state, 'starting-detector', ['start-detector']);

    case 'detector-opened':
      if (state.phase === 'off' || state.phase === 'suspended') {
        // A delayed native start may complete after disable/background.
        return { state, effects: ['stop-detector'] };
      }
      return state.phase === 'starting-detector'
        ? transition(state, 'wake-listening')
        : unchanged(state);

    case 'wake-detected':
      return state.phase === 'wake-listening'
        ? transition(state, 'stopping-detector', ['stop-detector'])
        : unchanged(state);

    case 'detector-released':
      return state.phase === 'stopping-detector'
        ? transition(state, 'starting-command', ['start-command'])
        : unchanged(state);

    case 'command-opened':
      if (state.phase === 'off' || state.phase === 'suspended') {
        return { state, effects: ['stop-command'] };
      }
      return state.phase === 'starting-command'
        ? transition(state, 'command-listening')
        : unchanged(state);

    case 'command-captured':
      return state.phase === 'command-listening'
        ? transition(state, 'stopping-command', ['stop-command'])
        : unchanged(state);

    case 'command-released':
      return state.phase === 'stopping-command'
        ? transition(state, 'processing', ['perform-command'])
        : unchanged(state);

    case 'turn-complete':
      return state.phase === 'processing' && state.enabled
        ? transition(state, 'starting-detector', ['start-detector'])
        : unchanged(state);

    default:
      return unchanged(state);
  }
};
