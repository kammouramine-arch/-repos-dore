import { create } from 'zustand';

import type { Session } from '@/core/domain/entities/user';
import { messageFor } from '@/core/domain/errors/appError';
import type { ServiceContainer } from '@/services/container';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  session: Session | null;
  status: AuthStatus;
  submitting: boolean;
  error: string | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (fullName: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Identity state for the whole app. `status` starts at `unknown` so the
 * navigator can wait for the persisted session instead of flashing the login
 * screen at a driver who is already signed in.
 */
export const createAuthStore = (services: ServiceContainer) =>
  create<AuthState>()((set) => {
    const authenticate = async (
      action: () => Promise<Session>,
      fallbackMessage: string,
    ): Promise<boolean> => {
      set({ submitting: true, error: null });

      try {
        const session = await action();
        // Opaque id only: crash reports must never carry an email or a name.
        services.crashReporter.identify(session.user.id);
        set({ session, status: 'authenticated', submitting: false });
        return true;
      } catch (error) {
        set({ submitting: false, error: messageFor(error, fallbackMessage) });
        return false;
      }
    };

    return {
      session: null,
      status: 'unknown',
      submitting: false,
      error: null,

      async restore() {
        const session = await services.authRepository.restoreSession();
        set({
          session,
          status: session ? 'authenticated' : 'unauthenticated',
        });
      },

      signIn: (email, password) =>
        authenticate(
          () => services.useCases.signIn({ email, password }),
          'Could not sign you in. Try again.',
        ),

      signUp: (fullName, email, password) =>
        authenticate(
          () => services.useCases.signUp({ fullName, email, password }),
          'Could not create your account. Try again.',
        ),

      async signOut() {
        await services.authRepository.signOut();
        services.crashReporter.identify(null);
        set({ session: null, status: 'unauthenticated', error: null });
      },

      clearError: () => set({ error: null }),
    };
  });
