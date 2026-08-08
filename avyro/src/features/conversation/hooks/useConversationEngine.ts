import { useCallback, useEffect, useRef } from 'react';

import { useServices, useStores } from '@/app/runtime/AppRuntime';
import { CONVERSATION } from '@/config';
import { buildRouteContext } from '@/core/conversation/routeContext';
import { matchWakePhrase } from '@/core/conversation/wakePhrase';
import {
  initialVoiceSessionState,
  voiceSessionReducer,
  type VoiceSessionEffect,
  type VoiceSessionEvent,
} from '@/core/conversation/voiceSession';
import { formatVoiceDebug } from '@/core/conversation/voiceDebug';
import type { ConversationEffect } from '@/core/conversation/conversationMachine';
import type { SpeechRecognitionSession } from '@/core/domain/ports/speechRecognizer';
import { runConversationAction } from '../runConversationAction';

/**
 * The conversation controller.
 *
 * Two pure machines decide; this carries out. `conversationMachine` owns a
 * turn — listening, thinking, speaking, being interrupted. `voiceSession` owns
 * the microphone's lifecycle — availability, permission, opening, reopening.
 * This hook owns the three things neither reducer may touch: the microphone,
 * the speaker, and the clock.
 *
 * There is exactly one microphone, so there is exactly one `sessionRef`. The
 * wake listener and a command session are the same device in two modes, never
 * two sessions at once.
 *
 * Mounted once, for the life of the app. Guidance announcements arrive here
 * even when voice commands are switched off, because the engine owns every
 * spoken word: two voices talking over each other is the one failure a driving
 * companion cannot recover from.
 */
export const useConversationEngine = (): void => {
  const services = useServices();
  const stores = useStores();

  const enabled = stores.preferences((state) => state.preferences.voiceCommands);
  const status = stores.conversation((state) => state.status);
  const pending = stores.conversation((state) => state.pending);

  const sessionRef = useRef<SpeechRecognitionSession | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const requestRef = useRef<AbortController | null>(null);

  const voiceRef = useRef(initialVoiceSessionState);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Invalidates in-flight starts.
   *
   * `start()` is asynchronous, so a session can land after the driver has
   * switched voice commands off or after a turn has claimed the microphone.
   * Bumping this on every close means such a session is stopped on arrival
   * instead of quietly becoming a second listener.
   */
  const generationRef = useRef(0);

  const dispatch = useCallback(
    (event: Parameters<ReturnType<typeof stores.conversation.getState>['dispatch']>[0]) =>
      stores.conversation.getState().dispatch(event),
    [stores],
  );

  /**
   * TEMPORARY — records one stage of the voice pipeline.
   *
   * Logged at `warn` on purpose: the console logger's floor is `warn` in a
   * release build, and this trace exists for TestFlight. Also kept in memory
   * so Settings can show it, because a Windows tester cannot read iOS device
   * logs. Remove with the rest of the diagnostics.
   */
  const voiceDebug = useCallback(
    (event: string, detail?: string) => {
      const entry = { at: Date.now(), event, detail };
      stores.conversation.getState().recordVoiceDebug(entry);
      services.logger.scoped('voice').warn(formatVoiceDebug(entry));
    },
    [services, stores],
  );

  const closeSession = useCallback(() => {
    // Invalidate first: a start that has not landed yet must not install
    // itself after the microphone has been released.
    generationRef.current += 1;
    sessionRef.current?.stop();
    sessionRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  /** Reads the live route context for the provider. */
  const readContext = useCallback(() => {
    const navigation = stores.navigation.getState();

    return buildRouteContext({
      navigationState: navigation.status,
      destination: navigation.destination ?? stores.trip.getState().destination,
      previousDestination: navigation.previousDestination,
      route: navigation.route,
      progress: navigation.progress,
      position: stores.location.getState().position,
      referent: stores.conversation.getState().referent,
      distanceUnit: stores.preferences.getState().preferences.distanceUnit,
    });
  }, [stores]);

  // ---- The microphone ---------------------------------------------------
  const clearVoiceTimer = useCallback(() => {
    if (voiceTimerRef.current === null) return;
    clearTimeout(voiceTimerRef.current);
    voiceTimerRef.current = null;
  }, []);

  /**
   * Runs the voice session machine and carries out what it decides.
   *
   * Every microphone decision goes through here, which is what makes "one
   * session at a time" and "never listen without permission" properties of the
   * system rather than conventions.
   */
  const sendVoice = useCallback(
    (event: VoiceSessionEvent) => {
      const logger = services.logger.scoped('conversation.voice');

      // Named and local so the asynchronous outcomes below can feed their
      // results back in. Recursion through the hook's own callback would tie
      // every future event to the identity of one render.
      const send = (current: VoiceSessionEvent): void => {
        const { state, effects } = voiceSessionReducer(voiceRef.current, current);
        const previous = voiceRef.current;
        voiceRef.current = state;

        voiceDebug(
          `voice_${current.type.replace(/-/g, '_')}`,
          `${previous.status} → ${state.status}` +
            (effects.length > 0 ? ` [${effects.map((e) => e.type).join(',')}]` : ''),
        );

        if (state.status !== previous.status || state.message !== previous.message) {
          stores.conversation
            .getState()
            .setVoice({ status: state.status, message: state.message });

          // The states a driver would notice are worth a record in a release
          // build: this is the line that explains a dead microphone later.
          if (
            state.status === 'denied' ||
            state.status === 'blocked' ||
            state.status === 'unsupported' ||
            state.status === 'failed'
          ) {
            logger.warn('voice commands unavailable', {
              status: state.status,
              failures: state.failures,
            });
            services.crashReporter.addBreadcrumb(`voice session ${state.status}`, {
              failures: state.failures,
            });
          }
        }

        const openSession = (onDevice: boolean) => {
          // Any session still held here is stale — the machine says none is
          // open — so releasing it keeps the device down to one listener.
          closeSession();

          const generation = (generationRef.current += 1);
          const isCurrent = () => generation === generationRef.current;
          let partials = 0;
          let lastPartialAt = 0;

          voiceDebug('wake_session_requested', `onDevice=${onDevice}`);

          void services.speechRecognizer
            .start(
              {
                locale: CONVERSATION.defaultLocale,
                interimResults: true,
                continuous: true,
                onDevice,
              },
              {
                onTranscript: ({ text, isFinal }) => {
                  if (!isCurrent()) {
                    voiceDebug('wake_transcript_dropped_stale', text.slice(0, 60));
                    return;
                  }

                  partials += 1;
                  // Throttled: partials stream continuously and would flush
                  // the whole trace. The first one is the proof that audio is
                  // reaching the recogniser at all.
                  const now = Date.now();
                  if (partials === 1 || now - lastPartialAt > 1_000 || isFinal) {
                    lastPartialAt = now;
                    voiceDebug(
                      isFinal ? 'wake_final_transcript' : 'wake_partial_transcript',
                      `#${partials} "${text.slice(0, 80)}"`,
                    );
                  }

                  const match = matchWakePhrase(text, CONVERSATION.defaultLocale);
                  if (!match) return;

                  voiceDebug(
                    'wake_phrase_matched',
                    match.remainder
                      ? `trailing command "${match.remainder}"`
                      : 'no trailing command — opening a listening turn',
                  );
                  dispatch({
                    type: 'wake-detected',
                    command: match.remainder || undefined,
                  });
                },
                onError: (error) => {
                  if (!isCurrent()) return;
                  voiceDebug(
                    'ERROR wake_session',
                    `code=${error.code} fatal=${error.fatal} "${error.message}"`,
                  );
                  // Silence is the normal state of a car, not a failure worth
                  // counting towards a backoff — reopen and keep waiting.
                  send(
                    error.code === 'no-speech'
                      ? { type: 'ended' }
                      : { type: 'failed', error },
                  );
                },
                onEnd: () => {
                  if (!isCurrent()) return;
                  voiceDebug('wake_session_ended', `partials=${partials}`);
                  send({ type: 'ended' });
                },
              },
            )
            .then((session) => {
              if (!isCurrent()) {
                voiceDebug('wake_session_discarded_stale');
                session.stop();
                return;
              }
              sessionRef.current = session;
              voiceDebug('microphone_started', `wake listener, onDevice=${onDevice}`);
              send({ type: 'opened' });
            })
            .catch((error) => {
              voiceDebug('ERROR wake_session_start_threw', String(error));
              if (!isCurrent()) return;
              send({
                type: 'failed',
                error: { code: 'unknown', message: String(error), fatal: false },
              });
            });
        };

        const apply = (effect: VoiceSessionEffect) => {
          switch (effect.type) {
            case 'check-availability':
              void Promise.all([
                services.speechRecognizer.isAvailable(),
                services.speechRecognizer.supportsOnDevice(CONVERSATION.defaultLocale),
              ])
                .then(([available, onDevice]) => {
                  voiceDebug(
                    'availability_checked',
                    `recogniser=${available} onDevice=${onDevice} locale=${CONVERSATION.defaultLocale}`,
                  );
                  send({ type: 'availability', available, onDevice });
                })
                .catch((error) => {
                  voiceDebug('ERROR availability_check_threw', String(error));
                  send({ type: 'availability', available: false, onDevice: false });
                });
              return;

            case 'request-permission': {
              const request = { networkRecognition: effect.networkRecognition };
              // Read before prompting: the platform shows each dialog once, and
              // a driver who already granted it should not be asked again.
              voiceDebug(
                'permission_requested',
                `networkRecognition=${effect.networkRecognition}`,
              );
              void services.speechRecognizer
                .getPermission(request)
                .then((current) => {
                  voiceDebug(
                    'permission_current',
                    `granted=${current.granted} canAskAgain=${current.canAskAgain}`,
                  );
                  return current.granted
                    ? current
                    : services.speechRecognizer.requestPermission(request);
                })
                .then(({ granted, canAskAgain }) => {
                  voiceDebug(
                    'permission_resolved',
                    `granted=${granted} canAskAgain=${canAskAgain}`,
                  );
                  send({ type: 'permission', granted, canAskAgain });
                })
                .catch((error) => {
                  voiceDebug('ERROR permission_threw', String(error));
                  send({ type: 'permission', granted: false, canAskAgain: false });
                });
              return;
            }

            case 'open-session':
              clearVoiceTimer();
              return openSession(effect.onDevice);

            case 'close-session':
              clearVoiceTimer();
              return closeSession();

            case 'schedule-retry':
              clearVoiceTimer();
              voiceTimerRef.current = setTimeout(
                () => send({ type: 'retry' }),
                effect.delayMs,
              );
              return;
          }
        };

        effects.forEach(apply);
      };

      send(event);
    },
    [services, stores, dispatch, closeSession, clearVoiceTimer, voiceDebug],
  );

  // Turning the switch on is what starts the permission flow; turning it off
  // is what guarantees the microphone is released.
  useEffect(() => {
    voiceDebug('voice_commands_preference', enabled ? 'enabled' : 'disabled');
    sendVoice({ type: enabled ? 'enabled' : 'disabled' });
  }, [enabled, sendVoice, voiceDebug]);

  // Declared before the effect runner so that on a status change the wake
  // listener is torn down before the runner opens a command session.
  useEffect(() => {
    voiceDebug('conversation_status', status);
    sendVoice({ type: status === 'idle' ? 'turn-ended' : 'turn-started' });
  }, [status, sendVoice, voiceDebug]);

  // ---- Effects ----------------------------------------------------------
  useEffect(() => {
    if (pending.length === 0) return;

    const effects = stores.conversation.getState().drain();
    const logger = services.logger.scoped('conversation');

    const startListening = () => {
      closeSession();

      // THE FIX. This session must run in the same recognition mode the
      // permission was granted for. When the wake listener runs on-device we
      // only ever requested the microphone — asking for network recognition
      // here means `SFSpeechRecognizer.requestAuthorization` was never called,
      // so iOS answers `not-allowed`, the machine cancels, and `cancelled`
      // emits no speech. That is silence after a correctly heard wake phrase.
      const onDevice = voiceRef.current.onDevice;
      let partials = 0;
      let lastPartial = '';

      voiceDebug('command_session_requested', `onDevice=${onDevice}`);

      void services.speechRecognizer
        .start(
          {
            locale: CONVERSATION.defaultLocale,
            interimResults: true,
            continuous: false,
            onDevice,
          },
          {
            onTranscript: ({ text, isFinal }) => {
              partials += 1;
              if (!isFinal) lastPartial = text;
              voiceDebug(
                isFinal ? 'final_transcript' : 'partial_transcript',
                `#${partials} "${text.slice(0, 80)}"`,
              );
              dispatch({ type: 'transcript', text, isFinal });
            },
            onError: (error) => {
              voiceDebug(
                'ERROR command_session',
                `code=${error.code} fatal=${error.fatal} "${error.message}"`,
              );
              dispatch({ type: 'recognition-failed', reason: error.message });
            },
            onEnd: () =>
              voiceDebug('command_session_ended', `partials=${partials}`),
          },
        )
        .then((session) => {
          sessionRef.current = session;
          voiceDebug('command_session_started', `onDevice=${onDevice}`);
        })
        .catch((error) => {
          voiceDebug('ERROR command_session_start_threw', String(error));
          dispatch({ type: 'recognition-failed', reason: String(error) });
        });

      timersRef.current.push(
        setTimeout(() => {
          // A recogniser that streams partials but never commits a final one
          // would strand the turn here and cancel it in silence. If we heard
          // words, act on them rather than throwing the driver's sentence away
          // — and say plainly in the trace that this is what happened.
          if (lastPartial.trim().length > 0) {
            voiceDebug(
              'listen_timeout_promoted_partial',
              `no final_transcript in ${CONVERSATION.listenTimeoutMs}ms; using last partial "${lastPartial.slice(0, 80)}"`,
            );
            dispatch({ type: 'transcript', text: lastPartial, isFinal: true });
            return;
          }

          voiceDebug(
            'ERROR listen_timeout',
            `nothing heard in ${CONVERSATION.listenTimeoutMs}ms — turn cancelled`,
          );
          dispatch({ type: 'listen-timeout' });
        }, CONVERSATION.listenTimeoutMs),
      );
    };

    const ask = (transcript: string) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      voiceDebug(
        'conversation_turn_started',
        `provider=${services.conversationProvider.name} transcript="${transcript.slice(0, 80)}"`,
      );

      void services.conversationProvider
        .respond({
          transcript,
          context: readContext(),
          origin: stores.location.getState().position?.coordinates ?? null,
          signal: controller.signal,
        })
        .then((reply) => {
          if (controller.signal.aborted) {
            voiceDebug('ai_response_discarded_aborted');
            return;
          }
          voiceDebug(
            'ai_response_received',
            `intent=${reply.intent.kind} action=${reply.action.type} speech="${reply.speech.slice(0, 80)}"`,
          );
          // A named place becomes what "take me there" means, until something
          // is actually chosen.
          stores.conversation.getState().setReferent(reply.referent);
          dispatch({ type: 'reply', reply });
        })
        .catch((error) => {
          voiceDebug('ERROR provider_failed', String(error));
          logger.warn('provider failed', { reason: String(error) });
          if (!controller.signal.aborted) {
            dispatch({ type: 'reply-failed', reason: 'Sorry, something went wrong.' });
          }
        });
    };

    const apply = (effect: ConversationEffect) => {
      switch (effect.type) {
        case 'start-listening':
          return startListening();
        case 'stop-listening':
          clearTimers();
          return closeSession();
        case 'ask-provider':
          return ask(effect.transcript);
        case 'speak': {
          // Never speak into an open microphone. A guidance announcement can
          // pre-empt from `idle`, where the wake listener is running and the
          // conversation machine has no reason to emit `stop-listening` — so
          // the release happens here, where speaking actually begins.
          closeSession();
          voiceDebug('tts_started', `"${effect.text.slice(0, 80)}"`);

          return void services.speechEngine
            .speak(effect.text, {
              onDone: () => {
                voiceDebug('tts_finished');
                dispatch({ type: 'speech-finished' });
              },
            })
            .catch((error) => {
              // Without this the engine strands in `speaking` forever: the
              // machine only leaves that state on `speech-finished`.
              voiceDebug('ERROR tts_threw', String(error));
              dispatch({ type: 'speech-finished' });
            });
        }
        case 'stop-speaking':
          voiceDebug('tts_stopped');
          return void services.speechEngine.stop();
        case 'run-action':
          voiceDebug('action_started', effect.reply.action.type);
          return void runConversationAction(effect.reply.action, {
            services,
            stores,
            logger,
          })
            .then(() => voiceDebug('action_finished', effect.reply.action.type))
            .catch((error) => {
              voiceDebug('ERROR action_failed', String(error));
              logger.warn('action failed', { reason: String(error) });
            });
        case 'schedule-dismiss':
          timersRef.current.push(
            setTimeout(
              () => dispatch({ type: 'dismiss' }),
              CONVERSATION.cancelledLingerMs,
            ),
          );
          return;
      }
    };

    effects.forEach(apply);

    // The suspended activity has been restored; tell the machine so it can
    // leave `resuming` for whatever it was doing before the maneuver.
    if (stores.conversation.getState().status === 'resuming') {
      dispatch({ type: 'resumed' });
    }
  }, [
    pending,
    services,
    stores,
    dispatch,
    readContext,
    closeSession,
    clearTimers,
    voiceDebug,
  ]);

  // ---- Teardown ---------------------------------------------------------
  useEffect(
    () => () => {
      clearTimers();
      clearVoiceTimer();
      closeSession();
      requestRef.current?.abort();
      void services.speechEngine.stop();
    },
    [services, clearTimers, clearVoiceTimer, closeSession],
  );
};
