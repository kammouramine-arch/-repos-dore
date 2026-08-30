import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { markdownToPlainText } from '@/lib/markdown';

/**
 * The row under an assistant reply. Deliberately quiet — these are always visible
 * rather than hidden behind a long-press, because an action nobody discovers is the
 * same as an action that does not exist.
 */
export function MessageActions({
  content,
  onRetry,
  retryLabel = 'Retry',
}: {
  content: string;
  /** Omitted for older messages, where re-running would rewrite history. */
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The confirmation is a timer on an unmountable row; without this a copy on the
  // last message before navigating away sets state on a gone component.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async () => {
    // The clipboard gets what the person sees, not the Markdown behind it.
    await Clipboard.setStringAsync(markdownToPlainText(content));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [content]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base, marginTop: theme.spacing.xs }}>
      <ActionButton
        icon={copied ? 'check' : 'copy'}
        label={copied ? 'Copied' : 'Copy'}
        tone={copied ? 'success' : 'muted'}
        onPress={copy}
      />
      {onRetry ? <ActionButton icon="refresh-cw" label={retryLabel} tone="muted" onPress={onRetry} /> : null}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  tone: 'muted' | 'success';
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : theme.colors.textTertiary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={theme.chat.actionHitSlop}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Feather name={icon} size={13} color={color} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
