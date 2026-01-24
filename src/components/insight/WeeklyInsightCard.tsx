/**
 * WeeklyInsightCard - 週次インサイト詳細表示カード
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { InsightPatternCard } from './InsightPatternCard';
import { WeeklyTimeline } from './WeeklyTimeline';
import type { WeeklyInsightData } from '../../types/weeklyInsight';

// サマリーの背景色
const SUMMARY_BG = {
  light: '#F9F9F9',
  dark: '#1A1A1A',
} as const;

interface WeeklyInsightCardProps {
  insight: WeeklyInsightData;
}

/**
 * 日付範囲を読みやすい形式に変換
 */
function formatDateRange(startDate: string, endDate: string): string {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [, endMonth, endDay] = endDate.split('-').map(Number);

  return `${startYear}年${startMonth}月${startDay}日 〜 ${endMonth}月${endDay}日`;
}

export const WeeklyInsightCard: React.FC<WeeklyInsightCardProps> = ({ insight }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const summaryBgColor = isDark ? SUMMARY_BG.dark : SUMMARY_BG.light;

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
            週間インサイト
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

      {/* 7日間タイムライン（インフォグラフィック） */}
      {insight.timeline && insight.timeline.length > 0 && (
        <WeeklyTimeline timeline={insight.timeline} />
      )}

      {/* サマリー */}
      <View style={[styles.summaryContainer, { backgroundColor: summaryBgColor }]}>
        <Text style={[styles.summaryText, { color: themeColors.text.primary }]}>
          {insight.summary}
        </Text>
      </View>

      {/* パターン一覧 */}
      <View style={styles.patternsSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
          発見されたパターン
        </Text>
        {insight.patterns.map((pattern, index) => (
          <InsightPatternCard key={index} pattern={pattern} />
        ))}
      </View>

      {/* 問いかけ */}
      <View style={[styles.questionContainer, { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }]}>
        <View style={styles.questionHeader}>
          <Ionicons name="chatbubble-ellipses" size={18} color={themeColors.primary} />
          <Text style={[styles.questionLabel, { color: themeColors.primary }]}>
            来週への問いかけ
          </Text>
        </View>
        <Text style={[styles.questionText, { color: themeColors.text.primary }]}>
          {insight.question}
        </Text>
      </View>

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
  summaryContainer: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    lineHeight: 24,
  },
  patternsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  questionContainer: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  questionLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  questionText: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
  },
  generatedAt: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
  },
});
