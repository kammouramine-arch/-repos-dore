import { requireOptionalNativeModule } from "expo";
import type {
  WakeWordDetector,
  WakeWordFailure,
} from "@/core/domain/ports/wakeWordDetector";

interface NativeWake {
  isAvailable(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: string,
    handler: (event: WakeWordFailure) => void,
  ): { remove(): void };
}

/** Dedicated KWS: no transcript, network, access key or paid wake licence. */
export const createSherpaWakeWordDetector = (): WakeWordDetector => {
  const native = requireOptionalNativeModule<NativeWake>("AvyroWake");
  return {
    async isAvailable() {
      return {
        available: !!native && (await native.isAvailable()),
        reason: native
          ? undefined
          : "Install a native Avyro build to use Hey Avyro.",
      };
    },
    async start(events) {
      if (!native)
        throw new Error("Offline wake detector is unavailable in this build.");
      const subscriptions = [
        native.addListener("detected", () => events.onDetected()),
        native.addListener("failure", (error) =>
          events.onError({ ...error, recoverable: true }),
        ),
      ];
      try {
        await native.start();
      } catch (error) {
        subscriptions.forEach((s) => s.remove());
        throw error;
      }
      let stopped = false;
      return {
        async stop() {
          if (stopped) return;
          stopped = true;
          subscriptions.forEach((s) => s.remove());
          await native.stop();
        },
      };
    },
  };
};
