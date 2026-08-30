import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { useVoice } from '@/hooks/useVoice';
import { features } from '@/config/features';

/**
 * The input bar.
 *
 * Voice is tap-to-start / tap-to-stop rather than hold-to-talk. Holding a 38pt target
 * steady while composing a thought is genuinely hard, and letting go early — the most
 * common failure — silently discarded the recording. Tapping also makes cancelling
 * possible, which hold-to-talk cannot offer at all.
 */
export function Composer({
  onSend,
  disabled,
  placeholder = 'Tell me what is going on…',
  voiceEnabled = true,
  busy,
  autoFocus,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceEnabled?: boolean;
  /** A reply is in flight — the send control becomes a progress affordance. */
  busy?: boolean;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const [height, setHeight] = useState<number>(theme.chat.composerMinHeight);
  const inputRef = useRef<TextInput>(null);
  const voice = useVoice();

  const canUseVoice = features.voiceCapture && voiceEnabled && voice.state !== 'unavailable';
  const hasText = value.trim().length > 0;
  const recording = voice.state === 'recording';
  const transcribing = voice.state === 'transcribing';

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled || busy) return;
    setValue('');
    setHeight(theme.chat.composerMinHeight);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSend(text);
  }, [busy, disabled, onSend, theme.chat.composerMinHeight, value]);

  const startVoice = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await voice.start();
  }, [voice]);

  const finishVoice = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const text = await voice.stop();
    if (!text) return;
    // The transcript lands in the box rather than being sent blind. Speech recognition
    // gets names and numbers wrong, and a sent message cannot be unsent.
    setValue((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    inputRef.current?.focus();
  }, [voice]);

  if (recording || transcribing) {
    return (
      <RecordingBar
        transcribing={transcribing}
        startedAt={voice.startedAt}
        onCancel={() => void voice.cancel()}
        onFinish={() => void finishVoice()}
      />
    );
  }

  return (
    <View style={{ gap: 6 }}>
      {voice.error ? (
        <Pressable onPress={voice.clearError} accessibilityRole="button" accessibilityLabel="Dismiss voice error">
          <Text variant="caption" color="danger">
            {voice.error}
          </Text>
        </Pressable>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingLeft: theme.spacing.base,
          paddingRight: 6,
          paddingVertical: 6,
        }}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          autoFocus={autoFocus}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel="Message"
          // Grows with the text, then scrolls instead of pushing the conversation off
          // the screen. Without the cap a pasted paragraph fills the whole display.
          onContentSizeChange={(e) =>
            setHeight(
              Math.min(
                theme.chat.composerMaxHeight,
                Math.max(theme.chat.composerMinHeight, e.nativeEvent.contentSize.height),
              ),
            )
          }
          scrollEnabled={height >= theme.chat.composerMaxHeight}
          style={{
            flex: 1,
            height,
            color: theme.colors.text,
            fontSize: 16,
            lineHeight: 21,
            paddingTop: Platform.OS === 'ios' ? 10 : 6,
            paddingBottom: 8,
            // iOS adds its own inset for multiline inputs, which offsets the caret
            // from the placeholder by a few points.
            textAlignVertical: 'center',
          }}
          onSubmitEditing={submit}
        />

        {canUseVoice && !hasText && !busy ? (
          <CircleButton
            icon="mic"
            label="Record a voice message"
            tone="neutral"
            onPress={() => void startVoice()}
          />
        ) : (
          <CircleButton
            icon={busy ? 'more-horizontal' : 'arrow-up'}
            label={busy ? 'Waiting for a reply' : 'Send'}
            tone={hasText && !busy ? 'accent' : 'neutral'}
            disabled={disabled || busy || !hasText}
            onPress={submit}
          />
        )}
      </View>
    </View>
  );
}

function CircleButton({
  icon,
  label,
  tone,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  tone: 'accent' | 'neutral' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const background =
    tone === 'accent' ? theme.colors.accent
    : tone === 'danger' ? theme.colors.danger
    : theme.colors.surfaceAlt;
  const foreground = tone === 'neutral' ? theme.colors.textSecondary : theme.colors.onAccent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        // Pressing shrinks the control slightly. It is the cheapest way to make a tap
        // feel acknowledged before the network answers.
        transform: [{ scale: pressed ? 0.92 : 1 }],
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <Feather name={icon} size={18} color={foreground} />
    </Pressable>
  );
}

/** Replaces the input while recording, so the state is impossible to miss. */
function RecordingBar({
  transcribing,
  startedAt,
  onCancel,
  onFinish,
}: {
  transcribing: boolean;
  startedAt: number | null;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const theme = useTheme();
  const [seconds, setSeconds] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (transcribing || !startedAt) return;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [startedAt, transcribing]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 620, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.65 }));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: transcribing ? theme.colors.border : theme.colors.danger,
        paddingLeft: theme.spacing.base,
        paddingRight: 6,
        paddingVertical: 6,
        minHeight: 52,
      }}
    >
      {transcribing ? (
        <>
          <Feather name="loader" size={15} color={theme.colors.textSecondary} />
          <Text variant="callout" color="secondary" style={{ flex: 1 }}>
            Transcribing…
          </Text>
        </>
      ) : (
        <>
          <Animated.View
            style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.danger }, dotStyle]}
          />
          <Text variant="callout" style={{ flex: 1 }}>
            Listening {formatSeconds(seconds)}
          </Text>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Discard recording"
            hitSlop={10}
            style={{ paddingHorizontal: theme.spacing.sm }}
          >
            <Text variant="subhead" color="secondary">
              Cancel
            </Text>
          </Pressable>
          <CircleButton icon="check" label="Stop and transcribe" tone="accent" onPress={onFinish} />
        </>
      )}
    </View>
  );
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
