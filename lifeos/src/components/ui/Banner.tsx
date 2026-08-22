import React from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Tone = 'info' | 'warning' | 'danger' | 'success';

/** Inline status message — used for offline mode, failed actions, config problems. */
export function Banner({
  tone = 'info',
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  tone?: Tone;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const map = {
    info: { bg: theme.colors.accentSoft, fg: theme.colors.accentText, icon: 'info' as const },
    warning: { bg: theme.colors.highlightSoft, fg: theme.colors.highlight, icon: 'alert-triangle' as const },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger, icon: 'alert-circle' as const },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success, icon: 'check-circle' as const },
  }[tone];

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: map.bg,
      }}
    >
      <Feather name={map.icon} size={17} color={map.fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subhead" style={{ color: map.fg }}>
          {title}
        </Text>
        {body ? (
          <Text variant="footnote" color="secondary">
            {body}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button" style={{ marginTop: 6 }}>
            <Text variant="subhead" style={{ color: map.fg }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss" accessibilityRole="button">
          <Feather name="x" size={16} color={map.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}
