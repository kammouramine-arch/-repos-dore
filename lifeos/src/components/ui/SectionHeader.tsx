import React from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function SectionHeader({
  title,
  action,
  onAction,
  caption,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  caption?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="overline" color="tertiary">
          {title.toUpperCase()}
        </Text>
        {caption ? (
          <Text variant="footnote" color="tertiary">
            {caption}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text variant="subhead" color="accent">
            {action}
          </Text>
          <Feather name="chevron-right" size={14} color={theme.colors.accentText} />
        </Pressable>
      ) : null}
    </View>
  );
}
