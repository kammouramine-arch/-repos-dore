import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, EmptyState, Field, Sheet, Skeleton, Text } from '@/components/ui';
import { useConversations } from '@/hooks/useConversations';
import { conversationTitle, type ConversationSummary } from '@/services/conversations';
import { relativeTimestamp } from '@/utils/date';
import { groupByAge } from '@/lib/conversationGroups';

/**
 * Conversation history.
 *
 * Every conversation was already being written to Supabase — nothing here creates or
 * fakes data. What was missing was any way to read the list back, so starting a new
 * chat buried the previous one permanently.
 */
export default function ChatHistory() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /*
    History sits above Talk as a modal, so the way back is to dismiss down to it with
    new params rather than to push another copy of the tabs. `canDismiss` is false when
    this screen was opened directly by a deep link and there is nothing beneath it,
    which is the only case that needs `replace`.
  */
  const openTalk = (params: string) => {
    const href = `/(tabs)/talk${params}` as const;
    if (router.canDismiss()) router.dismissTo(href);
    else router.replace(href);
  };
  const { conversations, loading, error, refreshing, refresh, rename, remove } = useConversations();
  const [renaming, setRenaming] = useState<{ conversation: ConversationSummary; draft: string } | null>(
    null,
  );

  const sections = useMemo(() => groupByAge(conversations), [conversations]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title3">Your conversations</Text>
        <Pressable
          onPress={() => openTalk('?new=1')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Start a new conversation"
        >
          <Feather name="edit" size={19} color={theme.colors.accentText} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={58} radius={theme.radius.md} />
          ))}
        </View>
      ) : error ? (
        <View style={{ padding: theme.spacing.lg }}>
          <EmptyState
            icon="alert-circle"
            title="Could not load your conversations"
            body={error instanceof Error ? error.message : undefined}
            actionLabel="Try again"
            onAction={() => void refresh()}
          />
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => (item.kind === 'header' ? `h-${item.label}` : item.conversation.id)}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.base,
            paddingBottom: insets.bottom + theme.spacing.xxl,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="No conversations yet"
              body="Everything you talk through is saved here, so you can pick it back up later."
              actionLabel="Start one"
              onAction={() => openTalk('?new=1')}
            />
          }
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Text
                variant="overline"
                color="tertiary"
                style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}
              >
                {item.label.toUpperCase()}
              </Text>
            ) : (
              <ConversationRow
                conversation={item.conversation}
                onOpen={() => openTalk(`?conversation=${item.conversation.id}`)}
                onRename={() =>
                  setRenaming({ conversation: item.conversation, draft: item.conversation.title ?? '' })
                }
                onDelete={() => confirmDelete(item.conversation, remove)}
              />
            )
          }
        />
      )}

      <RenameSheet
        draft={renaming?.draft ?? ''}
        onChange={(draft) => setRenaming((prev) => (prev ? { ...prev, draft } : prev))}
        visible={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        onSubmit={async () => {
          const target = renaming;
          setRenaming(null);
          if (target) await rename(target.conversation.id, target.draft);
        }}
      />
    </View>
  );
}

function confirmDelete(conversation: ConversationSummary, remove: (id: string) => Promise<void>) {
  // Deleting removes the messages too, via the cascade on ai_messages. That is not
  // recoverable from the app, so it is always confirmed.
  Alert.alert(
    'Delete this conversation?',
    `"${conversationTitle(conversation, conversation.preview)}" and its messages will be removed. This cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(conversation.id) },
    ],
  );
}

function ConversationRow({
  conversation,
  onOpen,
  onRename,
  onDelete,
}: {
  conversation: ConversationSummary;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const title = conversationTitle(conversation, conversation.preview);

  return (
    <Pressable
      onPress={onOpen}
      // Long-press is the shortcut; the ⋯ button is the discoverable path to the same
      // menu, so neither is the only way in.
      onLongPress={() => openMenu(title, onRename, onDelete)}
      accessibilityRole="button"
      accessibilityLabel={`Open conversation: ${title}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.xs,
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="footnote" color="tertiary" numberOfLines={1}>
          {relativeTimestamp(conversation.updated_at)}
          {conversation.messageCount > 0
            ? ` · ${conversation.messageCount} message${conversation.messageCount === 1 ? '' : 's'}`
            : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => openMenu(title, onRename, onDelete)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Options for ${title}`}
      >
        <Feather name="more-horizontal" size={18} color={theme.colors.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

function openMenu(title: string, onRename: () => void, onDelete: () => void) {
  Alert.alert(title, undefined, [
    { text: 'Rename', onPress: onRename },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/**
 * The draft lives in the parent rather than here, so opening the sheet for a different
 * conversation seeds the field by prop instead of by an effect that fights the render.
 */
function RenameSheet({
  draft,
  visible,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: string;
  visible: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title="Rename conversation">
      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.base }}>
        <Field
          label="Name"
          value={draft}
          onChangeText={onChange}
          placeholder="e.g. Career change"
          autoFocus
          maxLength={120}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button label="Save" onPress={onSubmit} style={{ flex: 1 }} />
          <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        </View>
        <Text variant="caption" color="tertiary">
          Clearing the name puts the first message back as the title.
        </Text>
      </View>
    </Sheet>
  );
}
