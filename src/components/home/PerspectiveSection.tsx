import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getTodayPerspectiveMessage, formatPerspectiveMessage } from '../../utils/perspectiveHelpers';

interface PerspectiveSectionProps {
  /** 残り年数 */
  remainingYears: number;
  /** 残り日数 */
  remainingDays: number;
  /** 残り週数 */
  remainingWeeks: number;
  /** 現在の年齢 */
  currentAge: number;
  /** 人生の進捗% */
  progressPercent: number;
  /** 誕生日（YYYY-MM-DD形式）*/
  birthday?: string;
  /** 連続記録日数 */
  streakDays?: number;
  /** 今日の日記記入済みか */
  hasTodayEntry?: boolean;
}

/**
 * 日替わり視点メッセージセクション
 * 毎日異なる視点で残り時間の有限性を伝える
 */
const PerspectiveSection: React.FC<PerspectiveSectionProps> = ({
  remainingYears,
  remainingDays,
  remainingWeeks,
  currentAge,
  progressPercent,
  birthday,
  streakDays,
  hasTodayEntry,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // 誕生日月を抽出（1-12）
  const birthdayMonth = birthday
    ? parseInt(birthday.split('-')[1], 10)
    : undefined;

  // 今日のメッセージを取得（誕生日月・ストリーク・日記記入状態を渡してフィルタリング）
  const todayMessage = getTodayPerspectiveMessage(birthdayMonth, {
    streakDays,
    hasTodayEntry,
  });
  const formattedMessage = formatPerspectiveMessage(todayMessage, {
    remainingYears,
    remainingDays,
    remainingWeeks,
    currentAge,
    progressPercent,
    streakDays,
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name="lightbulb-outline"
          size={16}
          color={themeColors.text.secondary}
        />
        <Text style={[styles.headerText, { color: themeColors.text.secondary }]}>今日の視点</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.emoji}>{formattedMessage.emoji}</Text>
        <Text style={[styles.mainText, { color: themeColors.text.primary }]}>{formattedMessage.mainText}</Text>
        {formattedMessage.subtext && (
          <Text style={[styles.subtext, { color: themeColors.text.secondary }]}>{formattedMessage.subtext}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    borderWidth: 1,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    // Android shadow
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  headerText: {
    ...textBase,
    fontSize: 13,
    fontFamily: fonts.family.regular,
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  mainText: {
    ...textBase,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  subtext: {
    ...textBase,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default PerspectiveSection;
