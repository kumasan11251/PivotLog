/**
 * CompactInsightButtons - 週間・月間インサイトへのコンパクトなボタン
 * 横並びで表示してスペースを節約
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { WeeklyInsightState } from '../../types/weeklyInsight';
import type { MonthlyInsightState } from '../../types/monthlyInsight';

interface CompactInsightButtonsProps {
  // 週間インサイト
  weeklyEntryCount: number;
  weeklyState: WeeklyInsightState;
  hasWeeklyInsight: boolean;
  canGenerateWeekly: boolean;
  onWeeklyPress: () => void;
  // 月間インサイト
  monthlyEntryCount: number;
  monthlyState: MonthlyInsightState;
  hasMonthlyInsight: boolean;
  canGenerateMonthly: boolean;
  onMonthlyPress: () => void;
}

export const CompactInsightButtons: React.FC<CompactInsightButtonsProps> = ({
  weeklyEntryCount,
  weeklyState,
  hasWeeklyInsight,
  canGenerateWeekly,
  onWeeklyPress,
  monthlyEntryCount,
  monthlyState,
  hasMonthlyInsight,
  canGenerateMonthly,
  onMonthlyPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  /**
   * 週間インサイトボタンの内容をレンダリング
   *
   * 状態の優先順位:
   * 1. hasWeeklyInsight = true → 生成済み → 「確認」表示、analyticsアイコン
   * 2. canGenerateWeekly = true → 未生成だが生成可能 → 「生成」バッジ表示
   * 3. それ以外 → データ不足 → 「過去を見る」表示
   */
  const renderWeeklyButton = () => {
    const isLoading = weeklyState === 'loading';
    const isActive = hasWeeklyInsight || canGenerateWeekly;

    // 生成済みの場合は「生成」バッジを表示しない
    const showGenerateBadge = canGenerateWeekly && !hasWeeklyInsight;

    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isActive ? `${themeColors.primary}15` : themeColors.surface,
            borderColor: isActive ? themeColors.primary : themeColors.border,
          },
        ]}
        onPress={onWeeklyPress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={themeColors.primary} />
        ) : (
          <>
            <View style={[styles.iconWrapper, { backgroundColor: `${themeColors.primary}20` }]}>
              <Ionicons
                name={hasWeeklyInsight ? 'analytics' : 'analytics-outline'}
                size={14}
                color={themeColors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.title,
                  { color: isActive ? themeColors.text.primary : themeColors.text.secondary },
                ]}
                numberOfLines={1}
              >
                週間
              </Text>
              <Text
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
                numberOfLines={1}
              >
                {hasWeeklyInsight ? '確認' : canGenerateWeekly ? `${weeklyEntryCount}日分` : '過去を見る'}
              </Text>
            </View>
            {showGenerateBadge && (
              <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.badgeText, { color: themeColors.text.inverse }]}>生成</Text>
              </View>
            )}
            {!showGenerateBadge && (
              <Ionicons name="chevron-forward" size={16} color={themeColors.text.secondary} />
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * 月間インサイトボタンの内容をレンダリング
   *
   * 状態の優先順位:
   * 1. hasMonthlyInsight = true → 生成済み → 「確認」表示、calendarアイコン
   * 2. canGenerateMonthly = true → 未生成だが生成可能 → 「生成」バッジ表示
   * 3. それ以外 → データ不足 → 「過去を見る」表示
   */
  const renderMonthlyButton = () => {
    const isLoading = monthlyState === 'loading';
    const isActive = hasMonthlyInsight || canGenerateMonthly;

    // 生成済みの場合は「生成」バッジを表示しない
    const showGenerateBadge = canGenerateMonthly && !hasMonthlyInsight;

    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isActive ? `${themeColors.primary}15` : themeColors.surface,
            borderColor: isActive ? themeColors.primary : themeColors.border,
          },
        ]}
        onPress={onMonthlyPress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={themeColors.primary} />
        ) : (
          <>
            <View style={[styles.iconWrapper, { backgroundColor: `${themeColors.primary}20` }]}>
              <Ionicons
                name={hasMonthlyInsight ? 'calendar' : 'calendar-outline'}
                size={14}
                color={themeColors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.title,
                  { color: isActive ? themeColors.text.primary : themeColors.text.secondary },
                ]}
                numberOfLines={1}
              >
                月間
              </Text>
              <Text
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
                numberOfLines={1}
              >
                {hasMonthlyInsight ? '確認' : canGenerateMonthly ? `${monthlyEntryCount}日分` : '過去を見る'}
              </Text>
            </View>
            {showGenerateBadge && (
              <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.badgeText, { color: themeColors.text.inverse }]}>生成</Text>
              </View>
            )}
            {!showGenerateBadge && (
              <Ionicons name="chevron-forward" size={16} color={themeColors.text.secondary} />
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderWeeklyButton()}
      {renderMonthlyButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
});
