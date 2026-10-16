import { probationaryMaximum } from '@/core/navigation/probationaryLimit';
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { WakeWordSession } from "@/core/domain/ports/wakeWordDetector";

import { useServices, useStores } from "@/app/runtime/AppRuntime";
import { CONVERSATION } from "@/config";
import { buildRouteContext } from "@/core/conversation/routeContext";
import { isRoadEvidenceCurrent } from '@/core/navigation/roadEvidence';
import {
  initialVoiceSessionState,
  voiceSessionReducer,
  type VoiceSessionEffect,
  type VoiceSessionEvent,
} from "@/core/conversation/voiceSession";
import { formatVoiceDebug } from "@/core/conversation/voiceDebug";
import { speechLanguage } from '@/core/conversation/frenchReply';
import { createSpeechCompletion, speechWatchdogMs } from '@/core/conversation/speechCompletion';
import type { ConversationEffect } from "@/core/conversation/conversationMachine";
import type { SpeechRecognitionSession } from "@/core/domain/ports/speechRecognizer";
import { runConversationAction } from "../runConversationAction";

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

  const enabled = stores.preferences(
    (state) => state.preferences.voiceCommands,
  );
  const status = stores.conversation((state) => state.status);
  const voiceLanguage = stores.preferences(state => state.preferences.voiceLanguage);
  const voiceDetection = stores.preferences(state => state.preferences.voiceDetection);
  const voiceOptions = useCallback(() => {
    const preferences = stores.preferences.getState().preferences;
    const frenchFirst = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr');
    return { locales: preferences.voiceLanguage === 'bilingual' ? (frenchFirst ? ['fr-FR', 'en-US'] : ['en-US', 'fr-FR']) : [preferences.voiceLanguage], engine: preferences.voiceDetection };
  }, [stores]);
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
  const wakeOpeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparationEpoch = useRef(0);
  /**
   * `preparing` had no exit of its own: one availability or permission
   * callback that never landed (or landed for a superseded epoch) left the
   * header reading "Connexion vocale…" for an entire drive (LRWF0930) with
   * hands-free never armed. This bounds it, and the diagnostics record which
   * step stalled.
   */
  const preparationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparationStepRef = useRef('none');
  const wakeHealthyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeSessionRef = useRef<WakeWordSession | null>(null);
  const releaseRef = useRef<Promise<void>>(Promise.resolve());

  const dispatch = useCallback(
    (
      event: Parameters<
        ReturnType<typeof stores.conversation.getState>["dispatch"]
      >[0],
    ) => stores.conversation.getState().dispatch(event),
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
      const entry = {
        at: Date.now(),
        event,
        detail:
          event.includes("transcript") ||
          event.includes("tts") ||
          event.includes("turn_started") ||
          event.includes("response_received")
            ? undefined
            : detail,
      };
      stores.conversation.getState().recordVoiceDebug(entry);
      services.logger
        .scoped("voice")
        .debug(formatVoiceDebug({ ...entry, detail: undefined }));
    },
    [services, stores],
  );

  const closeSession = useCallback(() => {
    // Invalidate first: a start that has not landed yet must not install
    // itself after the microphone has been released.
    generationRef.current += 1;
    if (wakeOpeningTimeoutRef.current) clearTimeout(wakeOpeningTimeoutRef.current);
    wakeOpeningTimeoutRef.current = null;
    if (wakeHealthyRef.current) clearTimeout(wakeHealthyRef.current);
    wakeHealthyRef.current = null;
    stores.conversation.getState().setCapture(false);
    const command = sessionRef.current;
    if (command)
      releaseRef.current = releaseRef.current.then(() => command.stop());
    sessionRef.current = null;
    const wake = wakeSessionRef.current;
    wakeSessionRef.current = null;
    if (wake) releaseRef.current = releaseRef.current.then(() => wake.stop());
  }, [stores]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  /**
   * The speaker's watchdog lives apart from `timersRef` on purpose:
   * `stop-listening` clears those, and a microphone event must never be able
   * to disarm the one thing guaranteeing a spoken reply leaves the screen.
   */
  const speechRef = useRef(createSpeechCompletion());
  const speechWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSpeechWatchdog = useCallback(() => {
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    speechWatchdogRef.current = null;
  }, []);

  /** Reads the live route context for the provider. */
  const readContext = useCallback(() => {
    const navigation = stores.navigation.getState();

    const context = buildRouteContext({
      navigationState: navigation.status,
      destination: navigation.destination ?? stores.trip.getState().destination,
      previousDestination: navigation.previousDestination,
      route: navigation.route,
      progress: navigation.progress,
      position: stores.location.getState().position,
      referent: stores.conversation.getState().referent,
      distanceUnit: stores.preferences.getState().preferences.distanceUnit,
    });
    const location = stores.location.getState();
    const prefs = stores.preferences.getState().preferences;
    const evidence = prefs.roadInformation && isRoadEvidenceCurrent(location.roadEvidence, location.position, Date.now()) ? location.roadEvidence : null;
    const probationary = probationaryMaximum(prefs.probationaryFrance, evidence?.countryCode, evidence?.legalRoadCategory, evidence?.speedLimit?.unit === 'km/h' ? evidence.speedLimit.value : null);
    return { ...context, currentRoadName: evidence?.roadName ?? null, probationaryMaximumKmh: probationary, stops: navigation.stops, nextInstructionFr: navigation.status === 'guiding' ? navigation.progress?.currentStep.instructionFr ?? null : null, nextInstruction: navigation.status === 'guiding' ? navigation.progress?.currentStep.instruction ?? null : null, mappedSpeedLimit: stores.preferences.getState().preferences.roadInformation && isRoadEvidenceCurrent(location.roadEvidence, location.position, Date.now()) ? location.roadEvidence?.speedLimit ?? null : null };
  }, [stores]);

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
      const logger = services.logger.scoped("conversation.voice");

      // Named and local so the asynchronous outcomes below can feed their
      // results back in. Recursion through the hook's own callback would tie
      // every future event to the identity of one render.
      const send = (current: VoiceSessionEvent): void => {
        if (current.type === "disabled" || current.type === "enabled") preparationEpoch.current++;
        const { state, effects } = voiceSessionReducer(
          voiceRef.current,
          current,
        );
        const previous = voiceRef.current;
        voiceRef.current = state;

        voiceDebug(
          `voice_${current.type.replace(/-/g, "_")}`,
          `${previous.status} → ${state.status}` +
            (effects.length > 0
              ? ` [${effects.map((e) => e.type).join(",")}]`
              : ""),
        );

        if (
          state.status !== previous.status ||
          state.message !== previous.message || state.open !== previous.open
        ) {
          stores.conversation
            .getState()
            .setVoice({ status: state.status, message: state.message, ready: state.open });

          // The states a driver would notice are worth a record in a release
          // build: this is the line that explains a dead microphone later.
          if (
            state.status === "denied" ||
            state.status === "blocked" ||
            state.status === "unsupported" ||
            state.status === "failed"
          ) {
            logger.warn("voice commands unavailable", {
              status: state.status,
              failures: state.failures,
            });
            services.crashReporter.addBreadcrumb(
              `voice session ${state.status}`,
              {
                failures: state.failures,
              },
            );
          }
        }

        const openSession = () => {
          // Any session still held here is stale — the machine says none is
          // open — so releasing it keeps the device down to one listener.
          closeSession();

          const generation = (generationRef.current += 1);
          const isCurrent = () => generation === generationRef.current;

          voiceDebug("wake_session_requested", "offline keyword model");
          wakeOpeningTimeoutRef.current = setTimeout(() => {
            if (isCurrent()) send({ type: 'failed', error: { code: 'audio-capture', message: 'Hands-free could not start. Use the microphone button.', fatal: false } });
          }, 20000);
          const opening = releaseRef.current
            .then(() => {
              if (!isCurrent()) throw new Error("Superseded wake session");
              return services.wakeWordDetector.start({
                onDetected: (command) => {
                  if (!isCurrent()) return;
                  closeSession();
                  void releaseRef.current.then(() => {
                    if (
                      stores.preferences.getState().preferences.voiceCommands &&
                      AppState.currentState === "active"
                    ) {
                      dispatch({ type: "wake-detected", command });
                    }
                  });
                },
                onError: (error) => {
                  if (isCurrent())
                    send({
                      type: "failed",
                      error: {
                        code: error.kind,
                        message: error.message,
                        fatal: !error.recoverable,
                      },
                    });
                },
              }, voiceOptions());
            })
            .then(async (session) => {
              if (!isCurrent()) {
                await session.stop();
                return;
              }
              if (wakeOpeningTimeoutRef.current) clearTimeout(wakeOpeningTimeoutRef.current);
              wakeOpeningTimeoutRef.current = null;
              wakeSessionRef.current = session;
              send({ type: "opened" });
              wakeHealthyRef.current = setTimeout(() => { if (isCurrent()) send({ type: "stable" }); }, 30000);
            });
          releaseRef.current = opening.then(
            () => undefined,
            () => undefined,
          );
          void opening.catch(() => {
            if (isCurrent())
              send({
                type: "failed",
                error: {
                  code: "audio-capture",
                  message: "Offline listening could not start.",
                  fatal: false,
                },
              });
          });
        };

        const apply = (effect: VoiceSessionEffect) => {
          switch (effect.type) {
            case "check-availability": {
              const epoch = preparationEpoch.current;
              preparationStepRef.current = "availability";
              if (preparationTimerRef.current) clearTimeout(preparationTimerRef.current);
              preparationTimerRef.current = setTimeout(() => {
                preparationTimerRef.current = null;
                if (epoch !== preparationEpoch.current || voiceRef.current.status !== "preparing") return;
                voiceDebug("ERROR preparation_stalled", `step=${preparationStepRef.current}`);
                send({ type: "failed", error: { code: "audio-capture", message: "Hands-free is taking longer than usual to start. Retrying…", fatal: false } });
              }, CONVERSATION.voicePreparationTimeoutMs);
              // Wake availability must not wait on Apple's speech asset setup.
              // Command recognition checks its own language when a turn starts.
              void services.wakeWordDetector.isAvailable(voiceOptions())
                .then((available) => {
                  if (epoch !== preparationEpoch.current) return;
                  voiceDebug("availability_checked", `keyword=${available.available}`);
                  send({
                    type: "availability",
                    available: available.available,
                    // Dedicated bundled keyword spotting is always offline.
                    onDevice: available.available,
                  });
                })
                .catch((error) => {
                  if (epoch !== preparationEpoch.current) return;
                  voiceDebug("ERROR availability_check_threw", String(error));
                  send({
                    type: "availability",
                    available: false,
                    onDevice: false,
                  });
                });
              return;
            }

            case "request-permission": {
              const epoch = preparationEpoch.current;
              preparationStepRef.current = "permission";
              const request = { networkRecognition: effect.networkRecognition };
              // Read before prompting: the platform shows each dialog once, and
              // a driver who already granted it should not be asked again.
              voiceDebug(
                "permission_requested",
                `networkRecognition=${effect.networkRecognition}`,
              );
              void services.speechRecognizer
                .getPermission(request)
                .then((current) => {
                  if (epoch !== preparationEpoch.current) throw new Error("Permission request superseded");
                  voiceDebug(
                    "permission_current",
                    `granted=${current.granted} canAskAgain=${current.canAskAgain}`,
                  );
                  return current.granted
                    ? current
                    : services.speechRecognizer.requestPermission(request);
                })
                .then(({ granted, canAskAgain }) => {
                  if (epoch !== preparationEpoch.current) return;
                  voiceDebug(
                    "permission_resolved",
                    `granted=${granted} canAskAgain=${canAskAgain}`,
                  );
                  send({ type: "permission", granted, canAskAgain });
                })
                .catch((error) => {
                  if (epoch !== preparationEpoch.current) return;
                  voiceDebug("ERROR permission_threw", String(error));
                  send({
                    type: "permission",
                    granted: false,
                    canAskAgain: false,
                  });
                });
              return;
            }

            case "open-session":
              clearVoiceTimer();
              return openSession();

            case "close-session":
              clearVoiceTimer();
              return closeSession();

            case "schedule-retry":
              clearVoiceTimer();
              voiceTimerRef.current = setTimeout(
                () => send({ type: "retry" }),
                effect.delayMs,
              );
              return;
          }
        };

        effects.forEach(apply);
      };

      send(event);
    },
    [services, stores, closeSession, clearVoiceTimer, voiceDebug, dispatch, voiceOptions],
  );

  // Turning the switch on is what starts the permission flow; turning it off
  // is what guarantees the microphone is released.
  useEffect(() => {
    voiceDebug("voice_commands_preference", enabled ? "enabled" : "disabled");
    sendVoice({ type: 'disabled' });
    sendVoice({
      type:
        enabled && AppState.currentState === "active" ? "enabled" : "disabled",
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        sendVoice({ type: "disabled" });
        closeSession();
        dispatch({ type: "listen-timeout" });
      } else if (enabled) sendVoice({ type: "enabled" });
    });
    return () => subscription.remove();
  }, [enabled, voiceLanguage, voiceDetection, sendVoice, voiceDebug, closeSession, dispatch]);

  // Declared before the effect runner so that on a status change the wake
  // listener is torn down before the runner opens a command session.
  useEffect(() => {
    voiceDebug("conversation_status", status);
    sendVoice({ type: status === "idle" ? "turn-ended" : "turn-started" });
  }, [status, sendVoice, voiceDebug]);

  // ---- Effects ----------------------------------------------------------
  useEffect(() => {
    if (pending.length === 0) return;

    const effects = stores.conversation.getState().drain();
    const logger = services.logger.scoped("conversation");

    const startListening = () => {
      closeSession();

      let partials = 0;
      let lastPartial = "";

      const generation = generationRef.current;
      const startupTimer = setTimeout(() => {
        if (generation !== generationRef.current) return;
        closeSession();
        dispatch({ type: "recognition-failed", reason: "The microphone could not start. Please try again." });
      }, 20000);
      timersRef.current.push(startupTimer);
      const opening = releaseRef.current
        .then(async () => {
          if (
            generation !== generationRef.current ||
            AppState.currentState !== "active"
          )
            throw new Error("Superseded command session");
          const requestedLocales = voiceOptions().locales;
          const supported = await Promise.all(requestedLocales.map(locale => services.speechRecognizer.supportsOnDevice(locale)));
          const installedLocales = requestedLocales.filter((_locale, index) => supported[index]);
          const onDevice = installedLocales.length > 0;
          const locales = requestedLocales;
          const permissionRequest = { networkRecognition: !onDevice };
          let permission =
            await services.speechRecognizer.getPermission(permissionRequest);
          if (!permission.granted)
            permission =
              await services.speechRecognizer.requestPermission(
                permissionRequest,
              );
          if (!permission.granted)
            throw new Error("Microphone permission is required.");
          if (
            generation !== generationRef.current ||
            AppState.currentState !== "active"
          )
            throw new Error("Superseded command session");
          return services.speechRecognizer.start(
            {
              locale: locales[0],
              locales,
              interimResults: true,
              continuous: false,
              onDevice,
            },
            {
              onAudioLevel: level => { if (generation === generationRef.current) stores.conversation.getState().setCapture(true, level); },
              onTranscript: ({ text, isFinal }) => {
                if (generation !== generationRef.current) return;
                partials += 1;
                if (!isFinal) lastPartial = text;
                voiceDebug(
                  isFinal ? "final_transcript" : "partial_transcript",
                  `#${partials} "${text.slice(0, 80)}"`,
                );
                dispatch({ type: "transcript", text, isFinal });
              },
              onError: (error) => {
                if (generation !== generationRef.current) return;
                voiceDebug(
                  "ERROR command_session",
                  `code=${error.code} fatal=${error.fatal} "${error.message}"`,
                );
                dispatch({ type: "recognition-failed", reason: error.message });
              },
              onEnd: () =>
                voiceDebug("command_session_ended", `partials=${partials}`),
            },
          );
        })
        .then(async (session) => {
          if (
            generation !== generationRef.current ||
            AppState.currentState !== "active"
          ) {
            await session.stop();
            return;
          }
          clearTimeout(startupTimer);
          sessionRef.current = session;
          stores.conversation.getState().setCapture(true);
          voiceDebug("command_session_started");
          timersRef.current.push(setTimeout(() => { void session.finish?.(); }, 12000));
          timersRef.current.push(
            setTimeout(() => {
              // Deliberately does NOT promote the last partial. A truncated
              // transcript is the thing that sent "take me to" to the parser and
              // "lil" to the geocoder; cancelling and letting the driver repeat
              // themselves is the honest outcome.
              voiceDebug(
                "ERROR listen_timeout",
                `no final transcript in ${CONVERSATION.listenTimeoutMs}ms` +
                  (lastPartial
                    ? ` — discarding partial "${lastPartial.slice(0, 60)}"`
                    : ""),
              );
              dispatch({ type: "listen-timeout" });
            }, stores.preferences.getState().preferences.cloudSpeech ? 35000 : CONVERSATION.listenTimeoutMs),
          );
        });
      releaseRef.current = opening.then(
        () => undefined,
        () => undefined,
      );
      void opening.catch((error) => {
        clearTimeout(startupTimer);
        voiceDebug("ERROR command_session_start_threw", String(error));
        if (generation === generationRef.current)
          dispatch({
            type: "recognition-failed",
            reason: /on-device speech language/i.test(String(error)) ? 'Offline voice needs a French or English speech language installed in iPhone Settings.' : "Voice could not start. Check microphone permission.",
          });
      });
    };

    const ask = (transcript: string) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      voiceDebug(
        "conversation_turn_started",
        `provider=${services.conversationProvider.name} transcript="${transcript.slice(0, 80)}"`,
      );

      void releaseRef.current
        .then(() =>
          services.conversationProvider.respond({
            transcript,
            context: readContext(),
            origin: stores.location.getState().position?.coordinates ?? null,
            signal: controller.signal,
          }),
        )
        .then((reply) => {
          if (controller.signal.aborted) {
            voiceDebug("ai_response_discarded_aborted");
            return;
          }
          voiceDebug(
            "ai_response_received",
            `intent=${reply.intent.kind} action=${reply.action.type} speech="${reply.speech.slice(0, 80)}"`,
          );
          // A named place becomes what "take me there" means, until something
          // is actually chosen.
          stores.conversation.getState().setReferent(reply.referent);
          dispatch({ type: "reply", reply });
        })
        .catch((error) => {
          voiceDebug("ERROR provider_failed", String(error));
          logger.warn("provider failed", { reason: String(error) });
          if (!controller.signal.aborted) {
            dispatch({
              type: "reply-failed",
              reason: "Sorry, something went wrong.",
            });
          }
        });
    };

    const apply = (effect: ConversationEffect) => {
      switch (effect.type) {
        case "start-listening":
          return startListening();
        case "stop-listening":
          clearTimers();
          requestRef.current?.abort();
          return closeSession();
        case "ask-provider":
          return ask(effect.transcript);
        case "speak": {
          // Never speak into an open microphone. A guidance announcement can
          // pre-empt from `idle`, where the wake listener is running and the
          // conversation machine has no reason to emit `stop-listening` — so
          // the release happens here, where speaking actually begins.
          closeSession();
          voiceDebug("tts_started", `"${effect.text.slice(0, 80)}"`);

          // The machine leaves `speaking` only on `speech-finished`, so this
          // utterance is ended by the TTS callback or by a watchdog sized to
          // the sentence — whichever comes first, exactly once. Completion is
          // keyed to its own token, never to the microphone: mic activity
          // during speech used to disarm both paths and strand the reply on
          // screen for a whole drive (see speechCompletion.ts).
          clearSpeechWatchdog();
          const turn = speechRef.current.begin((reason) => {
            clearSpeechWatchdog();
            voiceDebug(reason);
            dispatch({ type: "speech-finished" });
          });
          speechWatchdogRef.current = setTimeout(
            () => turn.finish("ERROR tts_watchdog_fired"),
            speechWatchdogMs(effect.text),
          );

          return void releaseRef.current
            .then(() => {
              // Superseded while the microphone was being released: the newer
              // utterance owns the speaker and its own completion.
              if (!turn.isCurrent()) return undefined;
              return services.speechEngine.speak(effect.text, {
                language: effect.language ?? speechLanguage(effect.text),
                onDone: () => turn.finish("tts_finished"),
              });
            })
            .catch((error) => {
              voiceDebug("ERROR tts_threw", String(error));
              turn.finish("tts_abandoned");
            });
        }
        case "stop-speaking":
          voiceDebug("tts_stopped");
          // An explicit stop: the machine has already left `speaking`, so the
          // cut-off utterance must not later report itself finished.
          speechRef.current.supersede();
          clearSpeechWatchdog();
          return void services.speechEngine.stop();
        case "run-action":
          voiceDebug("action_started", effect.reply.action.type);
          return void runConversationAction(effect.reply.action, {
            services,
            stores,
            logger,
          })
            .then(() => voiceDebug("action_finished", effect.reply.action.type))
            .catch((error) => {
              voiceDebug("ERROR action_failed", String(error));
              logger.warn("action failed", { reason: String(error) });
            });
        case "schedule-dismiss":
          timersRef.current.push(
            setTimeout(
              () => dispatch({ type: "dismiss" }),
              CONVERSATION.cancelledLingerMs,
            ),
          );
          return;
      }
    };

    effects.forEach(apply);

    // The suspended activity has been restored; tell the machine so it can
    // leave `resuming` for whatever it was doing before the maneuver.
    if (stores.conversation.getState().status === "resuming") {
      dispatch({ type: "resumed" });
    }
  }, [
    pending,
    services,
    stores,
    dispatch,
    readContext,
    voiceOptions,
    closeSession,
    clearTimers,
    clearSpeechWatchdog,
    voiceDebug,
  ]);

  // ---- Teardown ---------------------------------------------------------
  useEffect(
    () => () => {
      clearTimers();
      clearVoiceTimer();
      clearSpeechWatchdog();
      speechRef.current.supersede();
      if (preparationTimerRef.current) clearTimeout(preparationTimerRef.current);
      closeSession();
      requestRef.current?.abort();
      void services.speechEngine.stop();
    },
    [services, clearTimers, clearVoiceTimer, clearSpeechWatchdog, closeSession],
  );
};
