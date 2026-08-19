import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { useVoice } from '@/hooks/useVoice';
import { features } from '@/config/features';

/**
 * The input bar. Text always works; hold the microphone to speak. Voice is only
 * offered when the server can actually transcribe — otherwise the button explains why.
 */
export function Composer({
  onSend,
  disabled,
  placeholder = 'Tell me what is going on…',
  voiceEnabled = true,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceEnabled?: boolean;
}) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const voice = useVoice();
  const canUseVoice = features.voiceCapture && voiceEnabled && voice.state !== 'unavailable';

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    onSend(text);
  };

  return (
    <View style={{ gap: 6 }}>
      {voice.error ? (
        <Text variant="caption" color="danger">
          {voice.error}
        </Text>
      ) : null}
      {voice.state === 'recording' ? (
        <Text variant="caption" color="accent">
          Listening — release to send
        </Text>
      ) : voice.state === 'transcribing' ? (
        <Text variant="caption" color="secondary">
          Transcribing…
        </Text>
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
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxFontSizeMultiplier={1.4}
          accessibilityLabel="Message"
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: 16,
            lineHeight: 21,
            maxHeight: 120,
            paddingTop: Platform.OS === 'ios' ? 8 : 4,
            paddingBottom: 8,
          }}
          onSubmitEditing={submit}
        />

        {canUseVoice && value.trim().length === 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hold to speak"
            onPressIn={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              await voice.start();
            }}
            onPressOut={async () => {
              const text = await voice.stop();
              if (text) onSend(text);
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                voice.state === 'recording' ? theme.colors.danger : theme.colors.surfaceAlt,
            }}
          >
            <Feather
              name="mic"
              size={17}
              color={voice.state === 'recording' ? theme.colors.onAccent : theme.colors.textSecondary}
            />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={disabled || value.trim().length === 0}
            onPress={submit}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                value.trim().length === 0 ? theme.colors.surfaceAlt : theme.colors.accent,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Feather
              name="arrow-up"
              size={18}
              color={value.trim().length === 0 ? theme.colors.textTertiary : theme.colors.onAccent}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
