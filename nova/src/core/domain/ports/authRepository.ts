import type { Credentials, Session, SignUpDetails } from '../entities/user';

/**
 * Identity boundary. Sprint 1 ships a device-local implementation; swapping in
 * the hosted Nova identity service means providing another adapter and
 * changing one line in the service container.
 */
export interface AuthRepository {
  signIn(credentials: Credentials): Promise<Session>;
  signUp(details: SignUpDetails): Promise<Session>;
  signOut(): Promise<void>;
  /** Restores a persisted session at launch, or `null` when signed out. */
  restoreSession(): Promise<Session | null>;
}
