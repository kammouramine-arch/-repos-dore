import { Stack } from 'expo-router';
import { colors } from '@/theme';

/** Espace public : découverte du produit, avant tout compte. */
export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
    />
  );
}
