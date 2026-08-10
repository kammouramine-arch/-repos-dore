import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { voicePromptFor } from '@/core/conversation/voicePrompt';
import { useConversationStore } from '@/app/stores/hooks';
import { AppText, GlassPanel } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { VoiceOrb } from './VoiceOrb';

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
 */
export const VoiceHud = () => {
  const insets = useSafeAreaInsets();

  const status = useConversationStore((state) => state.status);
  const speaking = useConversationStore((state) => state.speaking);
  const error = useConversationStore((state) => state.error);

  const prompt = voicePromptFor(status, speaking, error);
  if (!prompt.visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { paddingBottom: insets.bottom + spacing.xxxl }]}
    >
      <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(140)}>
        <GlassPanel style={styles.panel}>
          <VoiceOrb tone={prompt.tone} />
          <AppText
            variant="callout"
            tone={prompt.tone === 'error' ? 'danger' : 'primary'}
            numberOfLines={2}
            style={styles.label}
          >
            {prompt.label}
          </AppText>
        </GlassPanel>
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
