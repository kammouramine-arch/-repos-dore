import { AppError } from '@/core/domain/errors/appError';
import type { AuthRepository } from '@/core/domain/ports/authRepository';
import type { Credentials, Session, SignUpDetails } from '@/core/domain/entities/user';
import {
  validateEmail,
  validateFullName,
  validatePassword,
} from '@/utils/validation';

interface Dependencies {
  authRepository: AuthRepository;
}

const normaliseEmail = (email: string): string => email.trim().toLowerCase();

const assert = (message: string | null): void => {
  if (message) throw new AppError('invalid-credentials', message);
};

/**
 * Signing in normalises the address and re-checks the shape of the input, so
 * the rule holds no matter which screen (or future deep link) calls it.
 */
export const createSignIn =
  ({ authRepository }: Dependencies) =>
  ({ email, password }: Credentials): Promise<Session> => {
    assert(validateEmail(email));
    if (password.length === 0) assert('Enter a password.');

    return authRepository.signIn({ email: normaliseEmail(email), password });
  };

export const createSignUp =
  ({ authRepository }: Dependencies) =>
  ({ email, password, fullName }: SignUpDetails): Promise<Session> => {
    assert(validateFullName(fullName));
    assert(validateEmail(email));
    assert(validatePassword(password));

    return authRepository.signUp({
      email: normaliseEmail(email),
      password,
      fullName: fullName.trim(),
    });
  };
