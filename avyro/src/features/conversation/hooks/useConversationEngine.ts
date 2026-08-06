import { useCallback, useEffect, useRef } from 'react';

import { useServices, useStores } from '@/app/runtime/AppRuntime';
import { CONVERSATION } from '@/config';
import { buildRouteContext } from '@/core/conversation/routeContext';
import { matchWakePhrase } from '@/core/conversation/wakePhrase';
import type { ConversationEffect } from '@/core/conversation/conversationMachine';
import type { SpeechRecognitionSession } from '@/core/domain/ports/speechRecognizer';
import { runConversationAction } from '../runConversationAction';

/**
 * The conversation controller.
 *
 * The state machine decides; this carries out. It owns the three things the
 * reducer must never touch — the microphone, the speaker, and the clock — and
 * feeds their results back in as events.
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

  const dispatch = useCallback(
    (event: Parameters<ReturnType<typeof stores.conversation.getState>['dispatch']>[0]) =>
      stores.conversation.getState().dispatch(event),
    [stores],
  );

  const closeSession = useCallback(() => {
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
      route: navigation.route,
      progress: navigation.progress,
      distanceUnit: stores.preferences.getState().preferences.distanceUnit,
    });
  }, [stores]);

  // ---- Wake phrase ------------------------------------------------------
  // Declared before the effect runner so that on a status change React tears
  // this session down before the runner opens a command session.
  useEffect(() => {
    if (!enabled || status !== 'idle') return;

    let cancelled = false;
    const logger = services.logger.scoped('conversation.wake');

    void services.speechRecognizer
      .start(
        { locale: CONVERSATION.defaultLocale, interimResults: true, continuous: true },
        {
          onTranscript: ({ text }) => {
            const match = matchWakePhrase(text, CONVERSATION.defaultLocale);
            if (!match) return;

            logger.debug('wake phrase heard');
            dispatch({ type: 'wake-detected', command: match.remainder || undefined });
          },
          onError: (reason) => logger.debug('wake listener stopped', { reason }),
          onEnd: () => undefined,
        },
      )
      .then((session) => {
        if (cancelled) session.stop();
        else sessionRef.current = session;
      })
      .catch((error) => logger.warn('could not start wake listener', { reason: String(error) }));

    return () => {
      cancelled = true;
      closeSession();
    };
  }, [enabled, status, services, dispatch, closeSession]);

  // ---- Effects ----------------------------------------------------------
  useEffect(() => {
    if (pending.length === 0) return;

    const effects = stores.conversation.getState().drain();
    const logger = services.logger.scoped('conversation');

    const startListening = () => {
      closeSession();
      void services.speechRecognizer
        .start(
          { locale: CONVERSATION.defaultLocale, interimResults: true, continuous: false },
          {
            onTranscript: ({ text, isFinal }) =>
              dispatch({ type: 'transcript', text, isFinal }),
            onError: (reason) => dispatch({ type: 'recognition-failed', reason }),
            onEnd: () => undefined,
          },
        )
        .then((session) => {
          sessionRef.current = session;
        })
        .catch((error) =>
          dispatch({ type: 'recognition-failed', reason: String(error) }),
        );

      timersRef.current.push(
        setTimeout(() => dispatch({ type: 'listen-timeout' }), CONVERSATION.listenTimeoutMs),
      );
    };

    const ask = (transcript: string) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      void services.conversationProvider
        .respond({
          transcript,
          context: readContext(),
          origin: stores.location.getState().position?.coordinates ?? null,
          signal: controller.signal,
        })
        .then((reply) => {
          if (!controller.signal.aborted) dispatch({ type: 'reply', reply });
        })
        .catch((error) => {
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
        case 'speak':
          return void services.speechEngine.speak(effect.text, {
            onDone: () => dispatch({ type: 'speech-finished' }),
          });
        case 'stop-speaking':
          return void services.speechEngine.stop();
        case 'run-action':
          return void runConversationAction(effect.reply.action, {
            services,
            stores,
            logger,
          }).catch((error) => logger.warn('action failed', { reason: String(error) }));
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
  }, [pending, services, stores, dispatch, readContext, closeSession, clearTimers]);

  // ---- Teardown ---------------------------------------------------------
  useEffect(
    () => () => {
      clearTimers();
      closeSession();
      requestRef.current?.abort();
      void services.speechEngine.stop();
    },
    [services, clearTimers, closeSession],
  );
};
