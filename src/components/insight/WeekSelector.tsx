/**
 * WeekSelector - 週選択ナビゲーションコンポーネント
 *
 * 前週/次週への移動と、現在選択中の週を表示するコンパクトなUI
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface WeekSelectorProps {
  /** 週の開始日 (YYYY-MM-DD) */
  startDate: string;
  /** 週の終了日 (YYYY-MM-DD) */
  endDate: string;
  /** 週番号 (1-53) */
  weekNumber: number;
  /** 年 */
  year: number;
  /** 前の週に移動 */
  onPreviousWeek: () => void;
  /** 次の週に移動 */
  onNextWeek: () => void;
  /** 次の週に移動可能か */
  canGoToNextWeek: boolean;
  /** 履歴ボタンを押した時 */
  onOpenHistory?: () => void;
  /** 先週かどうか */
  isLastWeek?: boolean;
}

/**
 * 日付を読みやすい形式に変換
 * 例: "2026-01-13" → "1/13（月）"
 */
function formatShortDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${month}/${day}（${dayOfWeek}）`;
}

/**
 * 日付範囲を読みやすい形式に変換
 * 例: "1/13（月）〜 1/19（日）"
 */
function formatDateRange(startDate: string, endDate: string): string {
  return `${formatShortDate(startDate)} 〜 ${formatShortDate(endDate)}`;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  startDate,
  endDate,
  weekNumber,
  year,
  onPreviousWeek,
  onNextWeek,
  canGoToNextWeek,
  onOpenHistory,
  isLastWeek = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  const containerBgStyle = { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' };
  const navButtonBgStyle = { backgroundColor: themeColors.background };

  return (
    <View style={[styles.container, containerBgStyle]}>
      {/* 前の週ボタン */}
      <TouchableOpacity
        style={[styles.navButton, navButtonBgStyle]}
        onPress={onPreviousWeek}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={themeColors.text.primary} />
      </TouchableOpacity>

      {/* 週情報 */}
      <TouchableOpacity
        style={styles.weekInfo}
        onPress={onOpenHistory}
        activeOpacity={onOpenHistory ? 0.7 : 1}
      >
        <View style={styles.weekHeader}>
          <Text style={[styles.weekLabel, { color: themeColors.text.secondary }]}>
            {year}年 第{weekNumber}週
          </Text>
          {isLastWeek && (
            <View style={[styles.lastWeekBadge, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.lastWeekBadgeText, { color: themeColors.text.inverse }]}>
                先週
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.dateRange, { color: themeColors.text.primary }]}>
          {formatDateRange(startDate, endDate)}
        </Text>
        {onOpenHistory && (
          <View style={styles.historyHint}>
            <Ionicons name="time-outline" size={12} color={themeColors.text.secondary} />
            <Text style={[styles.historyHintText, { color: themeColors.text.secondary }]}>
              タップで履歴を表示
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 次の週ボタン */}
      <TouchableOpacity
        style={[
          styles.navButton,
          navButtonBgStyle,
          !canGoToNextWeek && styles.navButtonDisabled,
        ]}
        onPress={onNextWeek}
        disabled={!canGoToNextWeek}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={canGoToNextWeek ? themeColors.text.primary : themeColors.text.secondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  weekInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  weekLabel: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
  },
  lastWeekBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lastWeekBadgeText: {
    ...textBase,
    fontSize: 10,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
  dateRange: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    fontWeight: '600',
  },
  historyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  historyHintText: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
    marginLeft: 2,
  },
});
