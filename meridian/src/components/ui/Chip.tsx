import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  small = false,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  color?: string;
  small?: boolean;
}) {
  const theme = useTheme();
  const tint = color ?? theme.colors.accent;
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: small ? 10 : 13,
        paddingVertical: small ? 5 : 8,
        borderRadius: theme.radius.pill,
        backgroundColor: selected ? tint : theme.colors.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: selected ? tint : theme.colors.border,
      }}
    >
      {icon ? (
        <Feather name={icon} size={small ? 11 : 13} color={selected ? theme.colors.onAccent : tint} />
      ) : null}
      <Text
        variant={small ? 'caption' : 'subhead'}
        style={{ color: selected ? theme.colors.onAccent : theme.colors.text }}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {body}
    </Pressable>
  );
}
