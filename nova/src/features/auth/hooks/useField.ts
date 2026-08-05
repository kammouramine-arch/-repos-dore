import { useCallback, useState } from 'react';

export interface Field {
  value: string;
  error: string | null;
  set: (value: string) => void;
  setError: (error: string | null) => void;
}

/**
 * One text field's state. Typing clears the field's own error — an error that
 * outlives the correction is the fastest way to make a form feel broken.
 */
export const useField = (initialValue = ''): Field => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback((next: string) => {
    setValue(next);
    setError((current) => (current === null ? current : null));
  }, []);

  return { value, error, set, setError };
};
