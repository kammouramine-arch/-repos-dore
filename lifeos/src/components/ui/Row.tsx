import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** Settings-style list row. Renders a chevron, a switch, or a trailing value. */
export function Row({
  icon,
  label,
  value,
  onPress,
  toggle,
  onToggle,
  destructive = false,
  last = false,
}: {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
        minHeight: 48,
      }}
    >
      {icon ? (
        <Feather
          name={icon}
          size={17}
          color={destructive ? theme.colors.danger : theme.colors.textSecondary}
        />
      ) : null}
      <Text variant="body" color={destructive ? 'danger' : 'primary'} style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text variant="callout" color="tertiary" numberOfLines={1} style={{ maxWidth: 150 }}>
          {value}
        </Text>
      ) : null}
      {onToggle ? (
        <Switch
          value={Boolean(toggle)}
          onValueChange={onToggle}
          trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
          accessibilityLabel={label}
        />
      ) : onPress ? (
        <Feather name="chevron-right" size={18} color={theme.colors.textTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => <View style={{ opacity: pressed ? 0.6 : 1 }}>{content}</View>}
    </Pressable>
  );
}
