/**
 * IntentionToActionCard - 想いを行動に変えた瞬間を表示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { IntentionToAction } from '../../types/weeklyInsight';

// 背景色
const SECTION_BG = {
  light: '#F0F7F4',
  dark: '#1A2520',
} as const;

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
  const bgColor = isDark ? SECTION_BG.dark : SECTION_BG.light;

  // 達成がない場合は表示しない
  if (intentionToAction.achieved.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Ionicons name="leaf" size={20} color={themeColors.primary} />
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          想いを行動に変えた瞬間
        </Text>
      </View>

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
              <Text style={[styles.achievementText, { color: themeColors.primary }]}>
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
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
    marginLeft: spacing.sm,
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
    fontSize: 13,
    fontFamily: fonts.family.regular,
    width: 40,
    marginRight: spacing.xs,
  },
  intentionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
  },
  arrowContainer: {
    paddingLeft: 40 + spacing.xs,
    paddingVertical: spacing.xs,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    marginVertical: spacing.md,
    marginLeft: 40 + spacing.xs,
  },
  analysisContainer: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  analysisText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
  },
  celebrationText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});
