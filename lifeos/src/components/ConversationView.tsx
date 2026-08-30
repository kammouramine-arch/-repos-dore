import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Button, Chip } from '@/components/ui';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { AiMessage } from '@/types/database';

type Message = AiMessage & { pending?: boolean };

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
  onRetry,
  suggestions = [],
  topBar,
  header,
  disabled,
  placeholder,
  bottomOffset = 0,
}: {
  messages: Message[];
  thinking: boolean;
  error: { message: string; code?: string } | null;
  onSend: (text: string) => void;
  onResolve?: (messageId: string, index: number, approve: boolean) => void;
  /** Re-runs the last exchange. Absent where retrying makes no sense. */
  onRetry?: () => void;
  suggestions?: string[];
  /** Pinned above the transcript — the title and controls stay reachable. */
  topBar?: React.ReactNode;
  /** Scrolls away with the conversation. */
  header?: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  bottomOffset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToEnd = useCallback((animated = true) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    // Only follow the conversation when the reader is already at the end. Yanking the
    // view down while someone is reading back an earlier answer is worse than a
    // missed scroll, and is exactly what the button below is for.
    if (!atBottom) return;
    const timer = setTimeout(() => scrollToEnd(), 60);
    return () => clearTimeout(timer);
  }, [atBottom, messages.length, scrollToEnd, thinking]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setAtBottom(distanceFromEnd < 48);
  }, []);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={bottomOffset}
    >
      {topBar}

      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            // Navigation headers are off app-wide, so without a pinned bar to own it
            // the transcript itself has to clear the status bar and notch.
            paddingTop: topBar ? theme.spacing.base : insets.top + theme.spacing.sm,
            paddingBottom: theme.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header ? <>{header}</> : null}
          renderItem={({ item }) => (
            <ChatMessage
              role={item.role}
              content={item.content}
              actions={item.actions ?? []}
              pending={item.pending}
              // Retry belongs to the newest reply only. Offering it further up implies
              // an earlier answer can be replaced, which is not what it does.
              onRetry={onRetry && item.id === lastAssistantId && !thinking ? onRetry : undefined}
              onResolve={
                onResolve ? (index, approve) => onResolve(item.id, index, approve) : undefined
              }
            />
          )}
          ListFooterComponent={
            <View style={{ gap: theme.spacing.md }}>
              {thinking ? <TypingIndicator /> : null}

              {error ? (
                <View style={{ marginTop: theme.spacing.xs, gap: theme.spacing.sm }}>
                  <Banner
                    tone={error.code === 'quota_exceeded' ? 'warning' : 'danger'}
                    title={
                      error.code === 'quota_exceeded'
                        ? 'Daily limit reached'
                        : 'Could not reach your planner'
                    }
                    body={error.message}
                  />
                  {/* A failed send leaves the typed message in the transcript, so the
                      only thing missing is a way to try it again. */}
                  {onRetry && error.code !== 'quota_exceeded' && error.code !== 'not_entitled' ? (
                    <View style={{ flexDirection: 'row' }}>
                      <Button label="Try again" size="sm" variant="secondary" onPress={onRetry} />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
        />

        {!atBottom && messages.length > 0 ? (
          <Animated.View
            entering={FadeIn.duration(theme.durations.fast)}
            exiting={FadeOut.duration(theme.durations.fast)}
            style={{ position: 'absolute', right: theme.spacing.lg, bottom: theme.spacing.md }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scroll to the latest message"
              onPress={() => scrollToEnd()}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.elevation.card,
              }}
            >
              <Feather name="arrow-down" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

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
        {suggestions.length > 0 && !thinking ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {suggestions.map((s) => (
              <Chip key={s} label={s} small onPress={() => onSend(s)} />
            ))}
          </ScrollView>
        ) : null}

        <Composer onSend={onSend} disabled={disabled} busy={thinking} placeholder={placeholder} />
      </View>
    </KeyboardAvoidingView>
  );
}
