import React, { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { useTheme } from '@/theme';
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown';

/**
 * Renders an assistant reply. The model writes Markdown regardless of instruction, so
 * this is what stops a reply reading as a wall of asterisks.
 *
 * `selectable` is on: being able to select a sentence out of an answer is table stakes
 * for a chat, and it costs nothing.
 */
export function Markdown({
  content,
  color,
  size = 'body',
}: {
  content: string;
  /** Overrides text colour — user bubbles print on the accent fill. */
  color?: string;
  size?: 'body' | 'callout';
}) {
  const theme = useTheme();
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  const base = color ?? theme.colors.text;
  const fontSize = size === 'body' ? 16 : 15;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {blocks.map((block, index) => (
        <BlockView
          key={index}
          block={block}
          base={base}
          fontSize={fontSize}
          // Consecutive list items belong to one list, so the gap between them is
          // tightened relative to the gap between a list and the paragraph after it.
          tightTop={index > 0 && isListRun(blocks[index - 1], block)}
        />
      ))}
    </View>
  );
}

function isListRun(previous: Block, current: Block): boolean {
  return previous.type === 'listItem' && current.type === 'listItem';
}

function BlockView({
  block,
  base,
  fontSize,
  tightTop,
}: {
  block: Block;
  base: string;
  fontSize: number;
  tightTop: boolean;
}) {
  const theme = useTheme();
  const marginTop = tightTop ? -theme.spacing.xs : 0;

  switch (block.type) {
    case 'heading': {
      const variant =
        block.level === 1 ? theme.typography.title2
        : block.level === 2 ? theme.typography.title3
        : theme.typography.bodyStrong;
      return (
        <RNText
          selectable
          accessibilityRole="header"
          maxFontSizeMultiplier={1.6}
          style={[variant, { color: base, marginTop: theme.spacing.xs }]}
        >
          <Inlines inlines={block.inlines} base={base} fontSize={variant.fontSize} />
        </RNText>
      );
    }

    case 'listItem':
      return (
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            marginTop,
            paddingLeft: block.depth * theme.spacing.base,
          }}
        >
          <RNText
            style={{
              color: block.ordered ? base : theme.colors.textTertiary,
              fontSize,
              lineHeight: theme.chat.lineHeight,
              // Ordered markers are wider; a fixed column keeps text aligned whether
              // the list runs to 9 or to 12.
              minWidth: block.ordered ? 20 : undefined,
            }}
          >
            {block.marker}
          </RNText>
          <RNText selectable maxFontSizeMultiplier={1.6} style={{ flex: 1, color: base, fontSize, lineHeight: theme.chat.lineHeight }}>
            <Inlines inlines={block.inlines} base={base} fontSize={fontSize} />
          </RNText>
        </View>
      );

    case 'code':
      return (
        <View
          style={{
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: theme.radius.sm,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
            paddingVertical: theme.spacing.sm,
          }}
        >
          {/* Code must not reflow: a wrapped command is a command that will not run. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}>
            <RNText selectable style={{ color: base, fontSize: 13, lineHeight: 19, fontFamily: MONO }}>
              {block.text}
            </RNText>
          </ScrollView>
        </View>
      );

    case 'quote':
      return (
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ width: 2, borderRadius: 1, backgroundColor: theme.colors.borderStrong }} />
          <RNText selectable maxFontSizeMultiplier={1.6} style={{ flex: 1, color: theme.colors.textSecondary, fontSize, lineHeight: theme.chat.lineHeight, fontStyle: 'italic' }}>
            <Inlines inlines={block.inlines} base={theme.colors.textSecondary} fontSize={fontSize} />
          </RNText>
        </View>
      );

    case 'rule':
      return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs }} />;

    default:
      return (
        <RNText selectable maxFontSizeMultiplier={1.6} style={{ color: base, fontSize, lineHeight: theme.chat.lineHeight }}>
          <Inlines inlines={block.inlines} base={base} fontSize={fontSize} />
        </RNText>
      );
  }
}

const MONO = 'Menlo';

function Inlines({ inlines, base, fontSize }: { inlines: Inline[]; base: string; fontSize: number }) {
  const theme = useTheme();
  return (
    <>
      {inlines.map((node, index) => {
        switch (node.type) {
          case 'bold':
            return <RNText key={index} style={{ fontWeight: '600' }}>{node.text}</RNText>;
          case 'italic':
            return <RNText key={index} style={{ fontStyle: 'italic' }}>{node.text}</RNText>;
          case 'boldItalic':
            return <RNText key={index} style={{ fontWeight: '600', fontStyle: 'italic' }}>{node.text}</RNText>;
          case 'strike':
            return <RNText key={index} style={{ textDecorationLine: 'line-through' }}>{node.text}</RNText>;
          case 'code':
            return (
              <RNText key={index} style={{ fontFamily: MONO, fontSize: fontSize - 2, color: theme.colors.accentText }}>
                {node.text}
              </RNText>
            );
          case 'link':
            return (
              <RNText
                key={index}
                accessibilityRole="link"
                style={{ color: theme.colors.accentText, textDecorationLine: 'underline' }}
                onPress={() => {
                  // A model can emit any URL. Opening is delegated to the OS, which
                  // shows the destination, and anything unopenable fails silently
                  // rather than throwing inside a message row.
                  Linking.openURL(node.href).catch(() => {});
                }}
              >
                {node.text}
              </RNText>
            );
          default:
            return <RNText key={index} style={{ color: base }}>{node.text}</RNText>;
        }
      })}
    </>
  );
}
