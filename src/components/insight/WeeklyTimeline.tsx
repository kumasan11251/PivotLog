/**
 * WeeklyTimeline - 週次インサイト用7日間タイムライン
 *
 * 週の各日を円形アイコンで表示し、記録の有無とキーワードを視覚化
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { DayHighlight } from '../../types/weeklyInsight';

// トーンに応じた色の定義
const TONE_COLORS = {
  positive: {
    bg: '#10B98120',
    border: '#10B981',
    text: '#10B981',
  },
  neutral: {
    bg: '#6B728020',
    border: '#6B7280',
    text: '#6B7280',
  },
  growth: {
    bg: '#8B5CF620',
    border: '#8B5CF6',
    text: '#8B5CF6',
  },
} as const;

interface WeeklyTimelineProps {
  timeline: DayHighlight[];
}

export const WeeklyTimeline: React.FC<WeeklyTimelineProps> = ({ timeline }) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  // タイムラインが空の場合は何も表示しない
  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* セクションヘッダー */}
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={16} color={themeColors.text.secondary} />
        <Text style={[styles.headerText, { color: themeColors.text.secondary }]}>
          週間の流れ
        </Text>
      </View>

      {/* タイムライン */}
      <View style={styles.timelineRow}>
        {timeline.map((day, index) => (
          <View key={day.date} style={styles.dayColumn}>
            {/* 接続線（最初の要素以外） */}
            {index > 0 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: isDark ? '#333' : '#E5E5E5' },
                ]}
              />
            )}

            {/* 日付表示 */}
            <Text style={[styles.dayOfWeek, { color: themeColors.text.secondary }]}>
              {day.dayOfWeek}
            </Text>

            {/* メインのドット/アイコン */}
            <View style={styles.dotContainer}>
              {day.hasEntry ? (
                <View
                  style={[
                    styles.activeDot,
                    day.isHighlight && styles.highlightDot,
                    {
                      backgroundColor: day.tone
                        ? TONE_COLORS[day.tone].bg
                        : TONE_COLORS.neutral.bg,
                      borderColor: day.isHighlight
                        ? themeColors.primary
                        : day.tone
                          ? TONE_COLORS[day.tone].border
                          : TONE_COLORS.neutral.border,
                    },
                  ]}
                >
                  {day.isHighlight ? (
                    <Ionicons name="star" size={14} color={themeColors.primary} />
                  ) : (
                    <View
                      style={[
                        styles.innerDot,
                        {
                          backgroundColor: day.tone
                            ? TONE_COLORS[day.tone].border
                            : TONE_COLORS.neutral.border,
                        },
                      ]}
                    />
                  )}
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyDot,
                    {
                      borderColor: isDark ? '#444' : '#D1D5DB',
                      backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
                    },
                  ]}
                />
              )}
            </View>

            {/* キーワード */}
            {day.hasEntry && day.keyword ? (
              <Text
                style={[
                  styles.keyword,
                  {
                    color: day.isHighlight
                      ? themeColors.primary
                      : day.tone
                        ? TONE_COLORS[day.tone].text
                        : themeColors.text.secondary,
                  },
                ]}
                numberOfLines={1}
              >
                {day.keyword}
              </Text>
            ) : (
              <Text style={[styles.keyword, { color: 'transparent' }]}>-</Text>
            )}
          </View>
        ))}
      </View>

      {/* 凡例 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDotActive, { backgroundColor: TONE_COLORS.positive.border }]} />
          <Text style={[styles.legendText, { color: themeColors.text.secondary }]}>喜び</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDotActive, { backgroundColor: TONE_COLORS.growth.border }]} />
          <Text style={[styles.legendText, { color: themeColors.text.secondary }]}>気づき</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="star" size={12} color={getColors(isDark).primary} />
          <Text style={[styles.legendText, { color: themeColors.text.secondary }]}>ハイライト</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 38, // dayOfWeek + 半分のdot高さ
    left: -50,
    right: 50,
    height: 2,
    zIndex: 0,
  },
  dayOfWeek: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    marginBottom: 6,
  },
  dotContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  activeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  keyword: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 40,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
  },
});
