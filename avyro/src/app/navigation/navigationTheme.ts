import { DarkTheme, type Theme } from '@react-navigation/native';

import { colors } from '@/ui/theme';

/** Maps Avyro's tokens onto the navigator's own theme contract. */
export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};
