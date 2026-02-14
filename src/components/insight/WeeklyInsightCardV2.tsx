/**
 * WeeklyInsightCardV2 - 週次インサイトV2詳細表示カード
 * 3セクション構成：意図追跡 + パターン + アクション
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { IntentionToActionCard } from './IntentionToActionCard';
import { InsightPatternCard } from './InsightPatternCard';
import { ActionSuggestionCard } from './ActionSuggestionCard';
import type { WeeklyInsightDataV2 } from '../../types/weeklyInsight';

interface WeeklyInsightCardV2Props {
  insight: WeeklyInsightDataV2;
}

/**
 * 日付範囲を読みやすい形式に変換
 */
function formatDateRange(startDate: string, endDate: string): string {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [, endMonth, endDay] = endDate.split('-').map(Number);

  return `${startYear}年${startMonth}月${startDay}日 〜 ${endMonth}月${endDay}日`;
}

export const WeeklyInsightCardV2: React.FC<WeeklyInsightCardV2Props> = ({ insight }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  // 意図追跡で達成があるかどうか
  const hasAchievements = insight.intentionToAction.achieved.length > 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="analytics" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            週間ふりかえり
          </Text>
          <Text style={[styles.dateRange, { color: themeColors.text.secondary }]}>
            {formatDateRange(insight.weekStartDate, insight.weekEndDate)}
          </Text>
        </View>
        <View style={[styles.entryCountBadge, { backgroundColor: themeColors.primary }]}>
          <Text style={[styles.entryCountText, { color: themeColors.text.inverse }]}>
            {insight.entryCount}日分
          </Text>
        </View>
      </View>

      {/* セクション1: 想いを行動に変えた瞬間（達成がある場合のみ） */}
      {hasAchievements && (
        <IntentionToActionCard intentionToAction={insight.intentionToAction} />
      )}

      {/* セクション2: 発見されたパターン */}
      <View style={styles.patternsSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={18} color={themeColors.primary} />
          <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
            見つかったパターン
          </Text>
        </View>
        {insight.patterns.map((pattern, index) => (
          <InsightPatternCard key={index} pattern={pattern} />
        ))}
      </View>

      {/* セクション3: 来週へのアクション */}
      <ActionSuggestionCard actionSuggestion={insight.actionSuggestion} />

      {/* 生成情報 */}
      <Text style={[styles.generatedAt, { color: themeColors.text.secondary }]}>
        {new Date(insight.generatedAt).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}に生成
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
  },
  entryCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  entryCountText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  patternsSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  generatedAt: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
