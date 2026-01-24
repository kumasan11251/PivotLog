/**
 * MonthSelector - 月選択ナビゲーションコンポーネント
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { MonthInfo } from '../../utils/monthUtils';

interface MonthSelectorProps {
  monthInfo: MonthInfo;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * 月情報を日本語表示用にフォーマット
 */
function formatMonthDisplay(monthInfo: MonthInfo): {
  yearMonth: string;
  dateRange: string;
} {
  const { year, month, startDate, endDate } = monthInfo;

  const [, , startDay] = startDate.split('-').map(Number);
  const [, , endDay] = endDate.split('-').map(Number);

  return {
    yearMonth: `${year}年 ${month}月`,
    dateRange: `${month}/${startDay}（月）〜 ${month}/${endDay}（${getLastDayOfWeek(endDate)}）`,
  };
}

/**
 * 曜日を取得
 */
function getLastDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  monthInfo,
  onPrevious,
  onNext,
  canGoNext,
}) => {
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);
  const { yearMonth, dateRange } = formatMonthDisplay(monthInfo);

  return (
    <View style={[styles.container, { borderBottomColor: themeColors.border }]}>
      {/* 前の月ボタン */}
      <TouchableOpacity
        style={[styles.navButton, { backgroundColor: themeColors.surface }]}
        onPress={onPrevious}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={themeColors.text.primary} />
      </TouchableOpacity>

      {/* 月表示 */}
      <View style={styles.monthDisplay}>
        <Text style={[styles.yearMonthText, { color: themeColors.text.secondary }]}>
          {yearMonth}
        </Text>
        <Text style={[styles.dateRangeText, { color: themeColors.text.primary }]}>
          {dateRange}
        </Text>
      </View>

      {/* 次の月ボタン */}
      <TouchableOpacity
        style={[
          styles.navButton,
          { backgroundColor: themeColors.surface },
          !canGoNext && styles.navButtonDisabled,
        ]}
        onPress={onNext}
        disabled={!canGoNext}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={canGoNext ? themeColors.text.primary : themeColors.text.secondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  monthDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  yearMonthText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
  },
  dateRangeText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    fontWeight: '500',
  },
});
