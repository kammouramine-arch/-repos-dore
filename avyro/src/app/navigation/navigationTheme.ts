import { DefaultTheme, type Theme } from '@react-navigation/native';

import { colors } from '@/ui/theme';

/** Maps Avyro's tokens onto the navigator's own theme contract. */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#087F83',
    background: '#F4F6F8',
    card: '#FFFFFF',
    text: '#132C38',
    border: colors.border,
    notification: colors.danger,
  },
};
