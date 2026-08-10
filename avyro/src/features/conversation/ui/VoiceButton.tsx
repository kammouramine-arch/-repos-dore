import { useConversationStore } from '@/app/stores/hooks';
import { canStartVoiceTurn } from '@/core/conversation/voicePrompt';
import { IconButton } from '@/ui/components';
import type { IconButtonProps } from '@/ui/components/IconButton';

export type VoiceButtonProps = Pick<IconButtonProps, 'variant' | 'size' | 'style'>;

/**
 * Tap to talk.
 *
 * Not a fallback for the wake phrase — the reliable path. "Hey Avyro" only
 * works while the app is open, and Apple stops a recognition task after about
 * a minute, so a driver who says it during that gap gets nothing. A button
 * always works, and pressing it enters exactly the same turn the wake phrase
 * would have started: the machine cannot tell the difference.
 *
 * Disabled rather than hidden when voice is unavailable, so the control does
 * not move around under the driver's thumb.
 */
export const VoiceButton = ({ variant, size, style }: VoiceButtonProps) => {
  const voice = useConversationStore((state) => state.voice.status);
  const status = useConversationStore((state) => state.status);
  const dispatch = useConversationStore((state) => state.dispatch);

  const listening = status === 'listening';
  const enabled = canStartVoiceTurn(voice, status);

  return (
    <IconButton
      name={listening ? 'mic' : 'mic-outline'}
      accessibilityLabel={listening ? 'Listening' : 'Ask Avyro'}
      active={listening}
      variant={variant}
      size={size}
      style={style}
      onPress={enabled ? () => dispatch({ type: 'wake-detected' }) : undefined}
    />
  );
};
