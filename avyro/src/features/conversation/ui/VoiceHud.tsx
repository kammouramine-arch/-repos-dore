import { t, useUiLanguage } from '@/ui/i18n';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { voicePromptFor } from '@/core/conversation/voicePrompt';
import { useConversationStore } from '@/app/stores/hooks';
import { AppText, GlassPanel } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { VoiceOrb } from './VoiceOrb';
import { VoiceFrame } from './VoiceFrame';

/**
 * The state of the conversation, on screen.
 *
 * Floats above every screen so the driver never has to wonder whether Avyro
 * heard them — the failure mode that made voice feel broken even when the
 * pipeline was working. Rendered only when there is something to say, so it
 * costs nothing while driving in silence.
 *
 * Deliberately bottom-anchored and single-line: the top of the screen belongs
 * to the maneuver banner, and nothing here may compete with it.
 *
 * The card is tappable: one touch stops Avyro and clears it. The map around it
 * stays touchable, so the card never blocks the screen it floats over.
 */
export const VoiceHud = () => {
  useUiLanguage();
  const insets = useSafeAreaInsets();

  const status = useConversationStore((state) => state.status);
  const speaking = useConversationStore((state) => state.speaking);
  const error = useConversationStore((state) => state.error);
  const ready = useConversationStore(state => state.commandReady);
  const level = useConversationStore(state => state.audioLevel);
  const transcript = useConversationStore(state => state.transcript);
  const dispatch = useConversationStore(state => state.dispatch);

  const prompt = voicePromptFor(status, speaking, error);
  if (!prompt.visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { paddingBottom: insets.bottom + spacing.xxxl }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <VoiceFrame state={status} level={level} active={(status === 'listening' && ready) || ['thinking', 'speaking'].includes(status)} />
      </View>
      <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(140)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Dismiss')}
          accessibilityHint={t('Tap to stop meepmeep and close this message.')}
          hitSlop={8}
          onPress={() => dispatch({ type: 'cancel' })}
        >
        <GlassPanel style={styles.panel}>
          <VoiceOrb tone={status === 'listening' && !ready ? 'idle' : prompt.tone} />
          <AppText
            variant="callout"
            tone={prompt.tone === 'error' ? 'danger' : 'primary'}
            numberOfLines={2}
            style={styles.label}
          >
            {status === 'listening' && !ready ? t('Just a moment…') : status === 'listening' && transcript ? transcript : t(prompt.label)}
          </AppText>
        </GlassPanel>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 420,
  },
  label: {
    flexShrink: 1,
  },
});
