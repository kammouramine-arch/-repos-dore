/**
 * Form-level validation shared by the sign-in and sign-up flows.
 * Returns `null` when the value is acceptable, or a driver-facing message.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;

export const validateFullName = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'Enter your name.';
  if (trimmed.length < 2) return 'That name looks too short.';
  return null;
};

export const validateEmail = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'That email address looks incomplete.';
  return null;
};

export const validatePassword = (value: string): string | null => {
  if (value.length === 0) return 'Enter a password.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Mix letters and numbers.';
  }
  return null;
};

export const validatePasswordConfirmation = (
  password: string,
  confirmation: string,
): string | null => (password === confirmation ? null : 'Passwords do not match.');
