import * as React from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Card, Caption, Muted, SectionHeader } from './ui';
import { SuccessCheck, useReducedMotion, useTouchMotion } from './motion';
import { colors, spacing, typography } from '@/theme';
import type { SetupStatus } from '@/features/setup-status';

/**
 * « À compléter » : la mise en place de l'atelier, en trois gestes.
 *
 * Une barre de progression qui grandit, des lignes qui restent visibles
 * jusqu'à ce qu'elles soient faites, et une coche qui se pose quand c'est
 * fait. Jamais un état d'erreur : ce sont des raccourcis, pas des reproches.
 */
export function SetupProgress({ status, en }: { status: SetupStatus; en: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const items = [
    { key: 'business', done: status.business, icon: 'business-outline' as const, label: en ? 'Complete your business profile' : 'Complétez votre entreprise', hint: en ? 'Legal details on every quote.' : 'SIRET, TVA et mentions sur vos devis.', href: '/entreprise' as const },
    { key: 'catalogue', done: status.catalogue, icon: 'book-outline' as const, label: en ? 'Add your catalogue' : 'Renseignez votre catalogue', hint: en ? 'Your prices, applied instead of estimated.' : 'Vos prix, appliqués au lieu d’être estimés.', href: '/catalogue' as const },
    { key: 'clients', done: status.clients, icon: 'people-outline' as const, label: en ? 'Add a client' : 'Ajoutez un client', hint: en ? 'Or create one while preparing a quote.' : 'Ou créez-le pendant un devis.', href: '/clients' as const },
  ];
  const done = items.filter((item) => item.done).length;
  const [progress] = React.useState(() => new Animated.Value(reduced ? done / items.length : 0));
  React.useEffect(() => {
    if (reduced) { progress.setValue(done / items.length); return undefined; }
    const animation = Animated.timing(progress, { toValue: done / items.length, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [done, items.length, progress, reduced]);
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <SectionHeader title={en ? 'To complete' : 'À compléter'} />
        <Caption style={{ color: done === items.length ? colors.success : colors.accent, fontWeight: '600' }}>{done}/{items.length}</Caption>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
        <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: done === items.length ? colors.success : colors.accent, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      <View style={{ gap: spacing.xs }}>
        {items.map(({ key, href, ...item }) => <SetupRow key={key} {...item} en={en} onPress={() => router.push(href)} />)}
      </View>
    </Card>
  );
}

function SetupRow({ done, icon, label, hint, en, onPress }: { done: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; en: boolean; onPress: () => void }) {
  const touch = useTouchMotion(0.985);
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ checked: done }}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => { touch.pressOut(); void Haptics.selectionAsync().catch(() => undefined); onPress(); }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: done ? colors.successSoft : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          {done ? <SuccessCheck size={22} /> : <Ionicons name={icon} size={18} color={colors.accent} />}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[typography.bodyStrong, { color: done ? colors.muted : colors.ink, textDecorationLine: done ? 'line-through' : 'none' }]}>{label}</Text>
          <Muted style={{ fontSize: 13 }}>{done ? (en ? 'Done' : 'Fait') : hint}</Muted>
        </View>
        <Ionicons name={done ? 'checkmark' : 'chevron-forward'} size={17} color={done ? colors.success : colors.subtle} />
      </Pressable>
    </Animated.View>
  );
}
