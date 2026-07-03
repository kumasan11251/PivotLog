import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface PreviousDayFocusHintProps {
  /** 前日の「明日、大切にしたいこと」(tomorrow)。null/空なら何も表示しない */
  text: string | null;
}

/**
 * 昨日の自分が書いた「明日、大切にしたいこと」を、今日の振り返りの入り口としてそっと差し出すヒント。
 *
 * - 達成チェック（「実行できましたか?」等）は一切出さず、第三者的な文言に留める
 * - 折りたたみ可能（デフォルトは閉じた状態。昨日の言葉が気になる人だけそっと開ける軽さ）
 * - text が null/空、または過去日で前日エントリが無い場合は黙って消える
 */
const PreviousDayFocusHint: React.FC<PreviousDayFocusHintProps> = ({ text }) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [expanded, setExpanded] = useState(false);

  // 別日付へ移動したあと、前の日付で開いた状態を引き継がないよう閉じた状態に戻す
  useEffect(() => {
    setExpanded(false);
  }, [text]);

  if (!text) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.surface, borderColor: themeColors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? '昨日、大切にしたいと書いたことを閉じる'
            : '昨日、大切にしたいと書いたことを開く'
        }
      >
        <Text style={[styles.title, { color: themeColors.text.secondary }]}>
          昨日のあなたは、こう書いていました
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={themeColors.text.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <Text style={[styles.body, { color: themeColors.text.primary }]}>{text}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.padding.screen,
    // DateNavigator の marginBottom: xxl(48) が直前にあるため、間隔が空きすぎないよう詰める
    marginTop: -spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  body: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
    marginTop: spacing.sm,
    ...textBase,
  },
});

export default PreviousDayFocusHint;
