import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface PreviousDayFocusHintProps {
  /** 前日の「明日、大切にしたいこと」(tomorrow)。null/空なら何も表示しない */
  text: string | null;
}

// 折りたたみ時に見せる最大行数。これを超える長文のときだけタップで全文表示できる
const COLLAPSED_LINES = 3;

/**
 * 昨日の自分が書いた「明日、大切にしたいこと」を、今日の振り返りの入り口としてそっと差し出すメモ。
 *
 * - 達成チェック（「実行できましたか?」等）は一切出さず、第三者的な文言に留める
 * - 下に続く3つの入力欄と見た目を揃えない（枠線なし・淡い塗り・大きめの角丸）ことで、
 *   「4つ目の入力項目」に見えないようにする
 * - 最初から言葉が見えている状態。長文（3行超）のときだけ省略し、タップで全文を開ける
 * - text が null/空、または過去日で前日エントリが無い場合は黙って消える
 */
const PreviousDayFocusHint: React.FC<PreviousDayFocusHintProps> = ({ text }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  // 展開状態・計測結果はテキストに紐づけて持つ。別日付へ移動して text が変わると
  // 自動的に「未展開・未計測」に戻るので、effect でのリセットが不要になる
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const [measured, setMeasured] = useState<{ text: string; lines: number } | null>(null);

  if (!text) {
    return null;
  }

  const quote = `「${text}」`;
  const expanded = expandedFor === text;
  // 省略なしで描画した場合の総行数（非表示の計測用Textから取得）
  const totalLines = measured?.text === text ? measured.lines : null;
  const isTruncatable = (totalLines ?? 0) > COLLAPSED_LINES;
  const showCollapsed = isTruncatable && !expanded;

  const handleMeasure = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    setMeasured({ text, lines: event.nativeEvent.lines.length });
  };

  return (
    <Pressable
      style={[styles.container, { backgroundColor: `${themeColors.primary}20` }]}
      onPress={() => setExpandedFor(expanded ? null : text)}
      disabled={!isTruncatable}
      accessibilityRole={isTruncatable ? 'button' : 'text'}
      accessibilityLabel={`昨日のあなたの言葉。${text}`}
      accessibilityHint={
        isTruncatable ? (expanded ? 'タップで折りたたむ' : 'タップで全文を表示') : undefined
      }
    >
      <Text style={[styles.label, { color: themeColors.text.secondary }]}>
        昨日のあなたの言葉
      </Text>
      <View style={styles.bodyWrapper}>
        <Text
          style={[styles.body, { color: themeColors.text.primary }]}
          numberOfLines={showCollapsed ? COLLAPSED_LINES : undefined}
        >
          {quote}
        </Text>
        {/* 総行数を知るための非表示コピー。レイアウトには影響させない */}
        <Text
          style={[styles.body, styles.measure]}
          onTextLayout={handleMeasure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {quote}
        </Text>
      </View>
      {isTruncatable && (
        <Text style={[styles.more, { color: themeColors.primaryDark }]}>
          {expanded ? '閉じる' : 'つづきを読む'}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.padding.screen,
    // DateNavigator の marginBottom: xxl(48) が直前にあるため、間隔が空きすぎないよう詰める
    marginTop: -spacing.xl,
    // 入力欄の並びとは別物だと分かるよう、最初の質問との間は少し広めに空ける
    marginBottom: spacing.xl + spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.large,
  },
  label: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  bodyWrapper: {
    position: 'relative',
  },
  body: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
    ...textBase,
  },
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  more: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    ...textBase,
  },
});

export default PreviousDayFocusHint;
