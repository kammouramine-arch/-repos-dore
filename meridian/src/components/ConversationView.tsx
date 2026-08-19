import React, { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Chip, Text } from '@/components/ui';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import type { AiActionReceipt, AiMessage } from '@/types/database';

/**
 * The shared conversation surface — used by Talk, the life interview, the daily reset
 * and Life Reset. Everything about how the assistant appears lives here.
 */
export function ConversationView({
  messages,
  thinking,
  error,
  onSend,
  onResolve,
  suggestions = [],
  header,
  disabled,
  placeholder,
  bottomOffset = 0,
}: {
  messages: (AiMessage & { pending?: boolean })[];
  thinking: boolean;
  error: { message: string; code?: string } | null;
  onSend: (text: string) => void;
  onResolve?: (messageId: string, index: number, approve: boolean) => void;
  suggestions?: string[];
  header?: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  bottomOffset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages.length, thinking]);

  const pending: AiActionReceipt[] = [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={bottomOffset}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            actions={message.actions ?? pending}
            onResolve={
              onResolve ? (index, approve) => onResolve(message.id, index, approve) : undefined
            }
          />
        ))}

        {thinking ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
            <AIOrb size={22} state="thinking" />
            <Text variant="callout" color="tertiary">
              Thinking…
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <Banner
              tone={error.code === 'quota_exceeded' ? 'warning' : 'danger'}
              title={error.code === 'quota_exceeded' ? 'Daily limit reached' : 'Could not reach your planner'}
              body={error.message}
            />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          gap: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        {suggestions.length && !thinking ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} small onPress={() => onSend(s)} />
            ))}
          </ScrollView>
        ) : null}

        <Composer onSend={onSend} disabled={disabled || thinking} placeholder={placeholder} />
      </View>
    </KeyboardAvoidingView>
  );
}
