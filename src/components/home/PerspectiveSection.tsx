import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';
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
}) => {
  // 今日のメッセージを取得
  const todayMessage = getTodayPerspectiveMessage();
  const formattedMessage = formatPerspectiveMessage(todayMessage, {
    remainingYears,
    remainingDays,
    remainingWeeks,
    currentAge,
    progressPercent,
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name="lightbulb-outline"
          size={16}
          color={colors.text.secondary}
        />
        <Text style={styles.headerText}>今日の視点</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.emoji}>{formattedMessage.emoji}</Text>
        <Text style={styles.mainText}>{formattedMessage.mainText}</Text>
        {formattedMessage.subtext && (
          <Text style={styles.subtext}>{formattedMessage.subtext}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
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
    color: colors.text.secondary,
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
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  subtext: {
    ...textBase,
    fontSize: 13,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default PerspectiveSection;
