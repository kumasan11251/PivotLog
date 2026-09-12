import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** 右側トグルの1区分。アイコンか文字ラベルのどちらかを指定する */
export interface PeriodSelectorSegment<T extends string> {
  value: T;
  icon?: IoniconName;
  label?: string;
  accessibilityLabel: string;
}

interface PeriodSelectorBarProps<T extends string> {
  selectedYear: number;
  selectedMonth: number;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** 年月ラベルのタップ（年月ピッカーを開くなど）。未指定なら押せない表示 */
  onMonthPress?: () => void;
  previousAccessibilityLabel?: string;
  nextAccessibilityLabel?: string;
  segments: PeriodSelectorSegment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * ヘッダー直下に置く「年月ナビ ＋ 表示切り替えトグル」のバー
 * 記録一覧（リスト/カレンダー）と習慣（週/月）で同じ見え方を共有する
 */
function PeriodSelectorBar<T extends string>({
  selectedYear,
  selectedMonth,
  isPreviousDisabled = false,
  isNextDisabled = false,
  onPrevious,
  onNext,
  onMonthPress,
  previousAccessibilityLabel = '前の月',
  nextAccessibilityLabel = '次の月',
  segments,
  value,
  onChange,
}: PeriodSelectorBarProps<T>) {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
      <View style={styles.monthSelector}>
        <TouchableOpacity
          onPress={onPrevious}
          style={[styles.arrowButton, isPreviousDisabled && styles.arrowButtonDisabled]}
          disabled={isPreviousDisabled}
          accessibilityRole="button"
          accessibilityLabel={previousAccessibilityLabel}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isPreviousDisabled ? themeColors.text.secondary : themeColors.text.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMonthPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!onMonthPress}
          style={[
            styles.monthButton,
            {
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="年月を選択"
        >
          <Text style={[styles.monthText, { color: themeColors.text.primary }]}>
            {selectedYear}年{selectedMonth}月
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          style={[styles.arrowButton, isNextDisabled && styles.arrowButtonDisabled]}
          disabled={isNextDisabled}
          accessibilityRole="button"
          accessibilityLabel={nextAccessibilityLabel}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isNextDisabled ? themeColors.text.secondary : themeColors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.viewModeToggle, { backgroundColor: themeColors.background }]}>
        {segments.map((segment) => {
          const isActive = segment.value === value;
          const foreground = isActive ? themeColors.text.inverse : themeColors.text.secondary;
          return (
            <TouchableOpacity
              key={segment.value}
              style={[
                styles.toggleButton,
                segment.label !== undefined && styles.toggleButtonText,
                isActive && { backgroundColor: themeColors.primary },
              ]}
              onPress={() => onChange(segment.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={segment.accessibilityLabel}
            >
              {segment.icon ? (
                <Ionicons name={segment.icon} size={20} color={foreground} />
              ) : (
                <Text style={[styles.toggleLabel, { color: foreground }]}>{segment.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.padding.screen,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.borderWidth,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    padding: spacing.xs,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  monthButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    borderWidth: spacing.borderWidth,
    marginHorizontal: spacing.sm,
  },
  monthText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    minWidth: 90,
    textAlign: 'center',
    ...textBase,
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderRadius: spacing.borderRadius.small,
    padding: 2,
  },
  toggleButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    // アイコン(20pt)＋余白と同じ高さに揃える
    minHeight: 36,
    minWidth: 36,
  },
  toggleButtonText: {
    paddingHorizontal: spacing.md,
  },
  toggleLabel: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    lineHeight: 20,
    ...textBase,
  },
});

export default PeriodSelectorBar;
