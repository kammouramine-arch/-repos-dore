import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { AIOrb, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { track } from '@/services/analytics';
import { brand } from '@/config/brand';

/**
 * The life interview. No forms: the user talks, and the assistant builds the first
 * version of their life plan from what it hears.
 */
export default function Interview() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversation = useConversation({ kind: 'onboarding', mode: 'onboarding' });

  useEffect(() => {
    track('onboarding_started');
  }, []);

  // The assistant finishes the interview by calling complete_onboarding; when that
  // action really succeeded, we move on — never before.
  useEffect(() => {
    const finished = conversation.messages.some((m) =>
      (m.actions ?? []).some((a) => a.tool === 'complete_onboarding' && a.status === 'succeeded'),
    );
    if (finished) {
      track('onboarding_completed');
      void queryClient.invalidateQueries();
      router.replace('/(onboarding)/reveal');
    }
  }, [conversation.messages, queryClient, router]);

  const openers = [
    'Honestly, I need to get my life together',
    'I want to get healthier',
    'I want to start a business',
    'I have too much going on',
  ];

  return (
    <ConversationView
      messages={conversation.messages}
      thinking={conversation.thinking}
      error={conversation.error}
      onSend={conversation.send}
      onResolve={conversation.resolve}
      suggestions={conversation.messages.length === 0 ? openers : conversation.suggestions}
      placeholder="Start anywhere…"
      header={
        conversation.messages.length === 0 ? (
          <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.xl }}>
            <AIOrb size={44} state="idle" />
            <Text variant="display">Let&apos;s build your life plan.</Text>
            <Text variant="body" color="secondary">
              Before we plan anything, I want to understand you. Tell me what your life
              looks like right now — what&apos;s working, what isn&apos;t, and what you want to
              change. Take as long as you like.
            </Text>
            <Text variant="caption" color="tertiary">
              {brand.aiName} keeps this to your account. You can delete any of it later.
            </Text>
          </View>
        ) : null
      }
    />
  );
}
