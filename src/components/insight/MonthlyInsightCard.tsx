/**
 * MonthlyInsightCard - 月次インサイト詳細表示カード
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MonthlyThemeCard } from './MonthlyThemeCard';
import { MonthlyHighlightCard } from './MonthlyHighlightCard';
import type { MonthlyInsightData } from '../../types/monthlyInsight';

// スタイル用の固定カラー
const COLORS = {
  improvement: '#10B981',
  improvementBg: '#10B98115',
  challenge: '#6366F1',
  challengeBg: '#6366F115',
  highlight: '#F59E0B',
  summaryBgLight: '#F9F9F9',
  summaryBgDark: '#1A1A1A',
  transformationBgLight: '#F8F8F8',
  transformationBgDark: '#2A2A2A',
} as const;

interface MonthlyInsightCardProps {
  insight: MonthlyInsightData;
}

/**
 * 日付範囲を読みやすい形式に変換
 */
function formatDateRange(startDate: string, _endDate: string): string {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  return `${startYear}年${startMonth}月`;
}

export const MonthlyInsightCard: React.FC<MonthlyInsightCardProps> = ({ insight }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const summaryBgColor = isDark ? COLORS.summaryBgDark : COLORS.summaryBgLight;
  const transformationBgColor = isDark ? COLORS.transformationBgDark : COLORS.transformationBgLight;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}20` }]}>
          <Ionicons name="calendar" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            月間インサイト
          </Text>
          <Text style={[styles.dateRange, { color: themeColors.text.secondary }]}>
            {formatDateRange(insight.monthStartDate, insight.monthEndDate)}
          </Text>
        </View>
        <View style={[styles.entryCountBadge, { backgroundColor: themeColors.primary }]}>
          <Text style={[styles.entryCountText, { color: themeColors.text.inverse }]}>
            {insight.entryCount}日分
          </Text>
        </View>
      </View>

      {/* サマリー */}
      <View style={[styles.summaryContainer, { backgroundColor: summaryBgColor }]}>
        <Text style={[styles.summaryText, { color: themeColors.text.primary }]}>
          {insight.summary}
        </Text>
      </View>

      {/* ハイライト */}
      {insight.highlights && insight.highlights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={18} color={COLORS.highlight} />
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              今月のハイライト
            </Text>
          </View>
          {insight.highlights.map((highlight, index) => (
            <MonthlyHighlightCard key={index} highlight={highlight} />
          ))}
        </View>
      )}

      {/* テーマ一覧 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="layers" size={18} color={themeColors.primary} />
          <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
            発見されたテーマ
          </Text>
        </View>
        {insight.themes.map((theme, index) => (
          <MonthlyThemeCard key={index} theme={theme} />
        ))}
      </View>

      {/* 成長と課題 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={18} color={COLORS.improvement} />
          <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
            成長と課題
          </Text>
        </View>

        {/* 成長した点 */}
        <View style={styles.improvementBox}>
          <Text style={styles.improvementLabel}>
            成長した点
          </Text>
          {insight.growth.improvements.map((item, index) => (
            <View key={index} style={styles.growthItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.improvement} />
              <Text style={[styles.growthText, { color: themeColors.text.primary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* 来月の課題 */}
        <View style={styles.challengeBox}>
          <Text style={styles.challengeLabel}>
            来月の課題
          </Text>
          {insight.growth.challenges.map((item, index) => (
            <View key={index} style={styles.growthItem}>
              <Ionicons name="flag" size={16} color={COLORS.challenge} />
              <Text style={[styles.growthText, { color: themeColors.text.primary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* 変化 */}
        {insight.growth.transformation && (
          <View style={[styles.transformationBox, { backgroundColor: transformationBgColor }]}>
            <Text style={[styles.transformationLabel, { color: themeColors.text.secondary }]}>
              月初→月末の変化
            </Text>
            <Text style={[styles.transformationText, { color: themeColors.text.primary }]}>
              {insight.growth.transformation}
            </Text>
          </View>
        )}
      </View>

      {/* 問いかけ */}
      <View style={[styles.questionContainer, { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }]}>
        <View style={styles.questionHeader}>
          <Ionicons name="chatbubble-ellipses" size={18} color={themeColors.primary} />
          <Text style={[styles.questionLabel, { color: themeColors.primary }]}>
            来月への問いかけ
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
  section: {
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
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  improvementBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    backgroundColor: '#10B98115',
    borderColor: '#10B981',
  },
  challengeBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    backgroundColor: '#6366F115',
    borderColor: '#6366F1',
  },
  improvementLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: '#10B981',
  },
  challengeLabel: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: '#6366F1',
  },
  growthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  growthText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 20,
  },
  transformationBox: {
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  transformationLabel: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
  },
  transformationText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
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
