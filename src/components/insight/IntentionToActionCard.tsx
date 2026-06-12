/**
 * IntentionToActionCard - 想いを行動に変えた瞬間を表示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { IntentionToAction } from '../../types/weeklyInsight';

interface IntentionToActionCardProps {
  intentionToAction: IntentionToAction;
}

/**
 * 日付をMM/DDの形式に変換
 */
function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${month}/${day}`;
}

export const IntentionToActionCard: React.FC<IntentionToActionCardProps> = ({
  intentionToAction,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  // 達成がない場合は表示しない
  if (intentionToAction.achieved.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      {/* 達成リスト */}
      <View style={styles.achievedList}>
        {intentionToAction.achieved.map((item, index) => (
          <View key={index} style={styles.achievedItem}>
            {/* 意図 */}
            <View style={styles.intentionRow}>
              <Text style={[styles.dateLabel, { color: themeColors.text.secondary }]}>
                {formatDate(item.intentionDate)}
              </Text>
              <Text style={[styles.intentionText, { color: themeColors.text.primary }]}>
                「{item.intention.slice(0, 40)}{item.intention.length > 40 ? '...' : ''}」
              </Text>
            </View>

            {/* 矢印 */}
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-down" size={16} color={themeColors.primary} />
            </View>

            {/* 達成 */}
            <View style={styles.achievementRow}>
              <Text style={[styles.dateLabel, { color: themeColors.text.secondary }]}>
                {formatDate(item.achievedDate)}
              </Text>
              <Text style={[styles.achievementText, { color: themeColors.text.primary }]}>
                「{item.achievement.slice(0, 40)}{item.achievement.length > 40 ? '...' : ''}」
              </Text>
            </View>

            {/* セパレーター（最後以外） */}
            {index < intentionToAction.achieved.length - 1 && (
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            )}
          </View>
        ))}
      </View>

      {/* なぜ達成できたかの分析 */}
      {intentionToAction.successAnalysis && (
        <View style={[styles.analysisContainer, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.analysisText, { color: themeColors.text.primary }]}>
            {intentionToAction.successAnalysis}
          </Text>
        </View>
      )}

      {/* 祝福コメント */}
      {intentionToAction.celebration && (
        <Text style={[styles.celebrationText, { color: themeColors.text.primary }]}>
          {intentionToAction.celebration}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
  },
  achievedList: {
    marginBottom: spacing.sm,
  },
  achievedItem: {
    marginBottom: spacing.sm,
  },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateLabel: {
    fontSize: fonts.size.insightSub,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightSub,
    width: 44,
    marginRight: spacing.xs,
  },
  intentionText: {
    flex: 1,
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
  arrowContainer: {
    paddingLeft: 44 + spacing.xs,
    paddingVertical: spacing.xs,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementText: {
    flex: 1,
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
  separator: {
    height: 1,
    marginVertical: spacing.md,
    marginLeft: 44 + spacing.xs,
  },
  analysisContainer: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  analysisText: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
  },
  celebrationText: {
    fontSize: fonts.size.insightBody,
    fontFamily: fonts.family.regular,
    lineHeight: fonts.lineHeight.insightBody,
    marginTop: spacing.sm,
  },
});
