import React from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';
import { AIOrb, Button, Card, Text } from '@/components/ui';
import type { AiActionReceipt } from '@/types/database';

/**
 * A message plus its receipts. Receipts are the app's answer to assistants that claim
 * work they never did: every row here corresponds to a stored, executed (or explicitly
 * pending, or failed) database action.
 */
export function ChatMessage({
  role,
  content,
  actions = [],
  onResolve,
  resolving,
}: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: AiActionReceipt[];
  onResolve?: (index: number, approve: boolean) => void;
  resolving?: boolean;
}) {
  const theme = useTheme();
  const isUser = role === 'user';

  if (isUser) {
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '86%', marginBottom: theme.spacing.base }}>
        <View
          style={{
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.lg,
            borderBottomRightRadius: theme.radius.xs,
            paddingHorizontal: theme.spacing.base,
            paddingVertical: theme.spacing.md,
          }}
        >
          <Text variant="body" color="onAccent">
            {content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <AIOrb size={22} state="idle" />
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Text variant="body">{content}</Text>

          {actions.length > 0 ? (
            <View style={{ gap: theme.spacing.xs, marginTop: 2 }}>
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
        </View>
      </View>
    </View>
  );
}

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
