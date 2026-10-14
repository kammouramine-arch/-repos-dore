import { useConversationStore, usePreferencesStore } from '@/app/stores/hooks';
import { canStartVoiceTurn } from '@/core/conversation/voicePrompt';
import { IconButton } from '@/ui/components';
import type { IconButtonProps } from '@/ui/components/IconButton';

export type VoiceButtonProps = Pick<IconButtonProps, 'variant' | 'size' | 'style'>;

/**
 * Tap to talk.
 *
 * Manual start/cancel alongside foreground offline wake detection. Holding
 * the control pauses hands-free listening rather than immediately rearming it.
 *
 * Disabled rather than hidden when voice is unavailable, so the control does
 * not move around under the driver's thumb.
 */
export const VoiceButton = ({ variant, size, style }: VoiceButtonProps) => {
  const voice = useConversationStore((state) => state.voice.status);
  const status = useConversationStore((state) => state.status);
  const dispatch = useConversationStore((state) => state.dispatch);
  const update = usePreferencesStore(state => state.update);

  const listening = status === 'listening';
  const busy = status !== 'idle' && status !== 'cancelled';
  const enabled = busy || canStartVoiceTurn(voice, status);

  return (
    <IconButton
      name={listening ? 'mic' : 'mic-outline'}
      accessibilityLabel={busy ? 'Stop voice conversation' : 'Ask Avyro'}
      accessibilityHint="Tap to start or stop a conversation. Hold to pause hands-free listening."
      active={listening}
      variant={variant}
      size={size}
      style={style}
      onPress={enabled ? () => dispatch({ type: busy ? 'cancel' : 'wake-detected' }) : undefined}
      onLongPress={() => { dispatch({ type: 'cancel' }); void update({ voiceCommands: false }); }}
    />
  );
};
