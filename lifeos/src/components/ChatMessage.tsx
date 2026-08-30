import React, { memo } from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';
import { Button, Card, Text } from '@/components/ui';
import { Markdown } from '@/components/chat/Markdown';
import { MessageActions } from '@/components/chat/MessageActions';
import type { AiActionReceipt } from '@/types/database';

/**
 * A message plus its receipts.
 *
 * The user's turn is a bubble; the assistant's is not. Long, formatted answers read
 * badly inside a tinted box, which is why every serious assistant renders its own side
 * flat and reserves the bubble for the short thing the person typed.
 *
 * Receipts are the app's answer to assistants that claim work they never did: every
 * row here corresponds to a stored, executed (or explicitly pending, or failed)
 * database action.
 */
export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  actions = [],
  onResolve,
  resolving,
  pending,
  onRetry,
  showActions = true,
}: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: AiActionReceipt[];
  onResolve?: (index: number, approve: boolean) => void;
  resolving?: boolean;
  /** The message is on screen but not yet acknowledged by the server. */
  pending?: boolean;
  onRetry?: () => void;
  showActions?: boolean;
}) {
  const theme = useTheme();

  if (role === 'user') {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`You said: ${content}`}
        style={{
          alignSelf: 'flex-end',
          maxWidth: theme.chat.maxBubbleWidth as `${number}%`,
          marginBottom: theme.chat.turnGap,
          opacity: pending ? 0.62 : 1,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.accent,
            borderRadius: theme.chat.bubbleRadius,
            borderBottomRightRadius: theme.chat.bubbleTailRadius,
            paddingHorizontal: theme.chat.bubblePaddingX,
            paddingVertical: theme.chat.bubblePaddingY,
          }}
        >
          {/* The person's own text is shown as written — no Markdown interpretation,
              so typing *asterisks* or a file_name shows exactly that. */}
          <Text
            variant="body"
            color="onAccent"
            selectable
            style={{ lineHeight: theme.chat.lineHeight }}
          >
            {content}
          </Text>
        </View>
      </View>
    );
  }

  if (role === 'system') {
    return (
      <View style={{ alignItems: 'center', marginBottom: theme.chat.turnGap }}>
        <Text variant="caption" color="tertiary">
          {content}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: theme.chat.turnGap, gap: theme.chat.groupGap }}>
      <Markdown content={content} />

      {actions.length > 0 ? (
        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xxs }}>
          {actions.map((action, index) => (
            <ActionReceiptRow
              key={`${action.tool}-${index}`}
              action={action}
              onResolve={onResolve ? (approve) => onResolve(index, approve) : undefined}
              resolving={resolving}
            />
          ))}
        </View>
      ) : null}

      {showActions && content.trim().length > 0 ? (
        <MessageActions content={content} onRetry={onRetry} />
      ) : null}
    </View>
  );
});

function ActionReceiptRow({
  action,
  onResolve,
  resolving,
}: {
  action: AiActionReceipt;
  onResolve?: (approve: boolean) => void;
  resolving?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();

  if (action.status === 'awaiting_confirmation') {
    return (
      <Card tone="accent" elevated={false} style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Feather name="alert-circle" size={15} color={theme.colors.accentText} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subhead" color="accent">
              Needs your approval
            </Text>
            <Text variant="callout">{action.summary}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            label="Do it"
            size="sm"
            loading={resolving}
            onPress={() => onResolve?.(true)}
            accessibilityHint="Runs the action the assistant proposed"
          />
          <Button label="Cancel" size="sm" variant="secondary" onPress={() => onResolve?.(false)} />
        </View>
      </Card>
    );
  }

  const map = {
    succeeded: { icon: 'check' as const, color: theme.colors.success },
    failed: { icon: 'x' as const, color: theme.colors.danger },
    rejected: { icon: 'slash' as const, color: theme.colors.textTertiary },
    awaiting_confirmation: { icon: 'clock' as const, color: theme.colors.accentText },
  }[action.status];

  // A capability the plan does not include is an offer, not an error.
  if (action.status === 'failed' && action.error === 'not_entitled') {
    return (
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Feather name="lock" size={12} color={theme.colors.accentText} />
        <Text variant="footnote" color="secondary" style={{ flex: 1 }}>
          Not done — {action.upgrade_name ? `part of ${action.upgrade_name}` : 'not on your plan'}
        </Text>
        <Button
          label={action.upgrade_name ? `See ${action.upgrade_name}` : 'See plans'}
          size="sm"
          variant="ghost"
          onPress={() => router.push('/paywall')}
        />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Feather name={map.icon} size={12} color={map.color} />
      <Text variant="footnote" color={action.status === 'failed' ? 'danger' : 'secondary'} style={{ flex: 1 }}>
        {action.summary}
      </Text>
    </View>
  );
}
