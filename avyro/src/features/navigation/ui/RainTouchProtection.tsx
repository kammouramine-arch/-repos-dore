import { t, useUiLanguage } from '@/ui/i18n';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationStore, usePreferencesStore } from '@/app/stores/hooks';
import { AppText } from '@/ui/components';

/** An explicit in-app touch shield; never changes iOS controls or microphone ownership. */
export function RainTouchProtection() {
  const enabled = usePreferencesStore(s => s.preferences.vehicleType === 'motorcycle' && s.preferences.rainProtection);
  const routeId = useNavigationStore(s => s.status === 'guiding' ? s.route?.id : null);
  return enabled && routeId ? <ActiveRainProtection key={routeId} /> : null;
}
function ActiveRainProtection() {
  useUiLanguage();
  const [locked, setLocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const unlockedDuringPress = useRef(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { setLocked(false); setHolding(false); }
    });
    return () => subscription.remove();
  }, []);
  const unlock = () => { setLocked(false); setHolding(false); };
  return <View onStartShouldSetResponder={() => locked} pointerEvents={locked ? 'auto' : 'box-none'} style={StyleSheet.absoluteFill}>
    <View pointerEvents="box-none" style={[styles.position, { top: insets.top + 160 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locked ? t('Unlock rain protection') : t('Lock screen against rain touches')}
        accessibilityHint={locked ? t('Hold for three seconds. With VoiceOver, use the Unlock action.') : t('Navigation and voice stay active.')}
        accessibilityActions={locked ? [{ name: 'activate', label: t('Unlock') }] : undefined}
        onAccessibilityAction={locked ? unlock : undefined}
        onPress={() => { if (!locked && !unlockedDuringPress.current) setLocked(true); }}
        onPressIn={() => { unlockedDuringPress.current = false; setHolding(true); }}
        onPressOut={() => setHolding(false)}
        onLongPress={() => { if (locked) { unlockedDuringPress.current = true; unlock(); } }}
        delayLongPress={3000}
        style={[styles.button, holding && styles.holding]}
      >
        <AppText style={styles.label}>{locked ? (holding ? t('Keep holding to unlock…') : t('Rain lock · hold 3s to unlock')) : t('Rain lock')}</AppText>
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  position: { position: 'absolute', right: 14, left: 14, alignItems: 'flex-end' },
  button: { minHeight: 48, justifyContent: 'center', borderRadius: 24, paddingHorizontal: 18, backgroundColor: '#163C49', borderWidth: 1, borderColor: '#82DCD4' },
  holding: { backgroundColor: '#286877' },
  label: { color: '#FFFFFF', fontSize: 13 },
});
