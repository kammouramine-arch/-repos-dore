import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Button, Card, Screen, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { useEntitlements } from '@/hooks/useEntitlements';
import { LimitReached } from '@/components/LimitReached';
import { AGENTS, isAgentKey } from '@shared/agents';
import { track } from '@/services/analytics';

/**
 * One agent run. The brief is fixed; the user adds context, and the agent works.
 * It is the same conversation surface as everywhere else — the difference is what the
 * assistant has been told to do and how long it is allowed to work.
 */
export default function AgentRun() {
  const theme = useTheme();
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const entitlements = useEntitlements();
  const allowance = entitlements.canRun('agent_run');
  const [started, setStarted] = useState(false);

  const agentKey = isAgentKey(key ?? '') ? key : 'life';
  const agent = AGENTS[agentKey as keyof typeof AGENTS];

  const conversation = useConversation({
    kind: 'planning',
    mode: 'agent_run',
    agent: agentKey,
    fresh: true,
  });

  if (!allowance.allowed) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </Pressable>
          <Text variant="display">{agent.name}</Text>
          <LimitReached
            kind={allowance.reason === 'quota_exceeded' ? 'quota_exceeded' : 'not_entitled'}
            upgradeName={allowance.upgradeTo?.name}
            resetsAt={entitlements.resetsAt}
          />
        </View>
      </Screen>
    );
  }

  if (!started && conversation.messages.length === 0) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.xl, paddingTop: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="chevron-left" size={24} color={theme.colors.text} />
            </Pressable>
            <AIOrb size={30} state="idle" />
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.accentSoft,
              }}
            >
              <Feather
                name={agent.icon as keyof typeof Feather.glyphMap}
                size={19}
                color={theme.colors.accentText}
              />
            </View>
            <Text variant="display">{agent.name}</Text>
            <Text variant="body" color="secondary">
              {agent.description}
            </Text>
          </View>

          <Card tone="alt" elevated={false}>
            <Text variant="subhead">What it will do</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {[
                'Read your goals, habits, projects and the weeks around you',
                'Decide what actually needs to change',
                'Make those changes itself, and ask before anything it cannot undo',
                'Report back what it changed and what it left alone',
              ].map((line) => (
                <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
                  <Feather name="check" size={13} color={theme.colors.success} style={{ marginTop: 3 }} />
                  <Text variant="footnote" color="secondary" style={{ flex: 1 }}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Button
            label="Start the agent"
            full
            size="lg"
            onPress={() => {
              track('agent_run_started', { agent: agentKey });
              setStarted(true);
            }}
          />
          <Text variant="caption" color="tertiary" align="center">
            A run takes longer than a normal reply — it is doing more.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ConversationView
        messages={conversation.messages}
        thinking={conversation.thinking}
        error={conversation.error}
        onSend={conversation.send}
        onResolve={conversation.resolve}
        suggestions={conversation.messages.length === 0 ? agent.examples : conversation.suggestions}
        placeholder={agent.prompt}
        header={
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: theme.spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
              <View>
                <Text variant="title3">{agent.name}</Text>
                <Text variant="caption" color="tertiary">
                  {conversation.thinking ? 'Working…' : agent.tagline}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={22} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
