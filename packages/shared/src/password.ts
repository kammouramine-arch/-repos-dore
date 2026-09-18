/** Identical rules on the phone and server; never trim a password. */
export const PASSWORD_HINT = '10 caractères minimum, avec une lettre et un chiffre.';

export function passwordErrors(value: string): string[] {
  const errors: string[] = [];
  if (value.length < 10) errors.push('Au moins 10 caractères.');
  if (value.length > 200) errors.push('200 caractères maximum.');
  if (!/[a-zà-ÿ]/i.test(value)) errors.push('Ajoutez au moins une lettre.');
  if (!/\d/.test(value)) errors.push('Ajoutez au moins un chiffre.');
  return errors;
}
