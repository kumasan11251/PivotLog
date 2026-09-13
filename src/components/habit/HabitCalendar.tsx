import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useHorizontalSwipe } from '../../hooks/useHorizontalSwipe';
import { parseLocalDateString, getMonthGridWeeks } from '../../utils/dateUtils';
import type { HabitSummaryByDate } from '../../hooks/useDailyHabits';
import type { HabitCalendarMode } from '../../types/habit';
import { fonts, spacing, textBase, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const SUNDAY_COLOR = '#E57373';
const SATURDAY_COLOR = '#64B5F6';

/** ヘッダー下バーの矢印から、スワイプと同じ演出で期間を移動させるためのハンドル */
export interface HabitCalendarHandle {
  goPrevious: () => void;
  goNext: () => void;
}

interface HabitCalendarProps {
  mode: HabitCalendarMode;
  /** 日曜始まりの7日分の日付（YYYY-MM-DD）。週モードで使用 */
  weekDates: string[];
  selectedDate: string;
  today: string;
  summary: HabitSummaryByDate;
  onSelectDate: (date: string) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  /** 横スワイプ中は親ScrollViewの縦スクロールを止めるための通知 */
  onSwipeActiveChange?: (isSwiping: boolean) => void;
}

const HabitCalendar = forwardRef<HabitCalendarHandle, HabitCalendarProps>(
  (
    {
      mode,
      weekDates,
      selectedDate,
      today,
      summary,
      onSelectDate,
      onPreviousWeek,
      onNextWeek,
      onPreviousMonth,
      onNextMonth,
      onGoToToday,
      onSwipeActiveChange,
    },
    ref
  ) => {
    const { isDark } = useTheme();
    const themeColors = useMemo(() => getColors(isDark), [isDark]);
    const isMonthMode = mode === 'month';
    const isViewingToday = selectedDate === today;

    // 横スワイプで前後の週/月へ（習慣カードの日送りと同じ演出・同じ方向の約束）
    const swipe = useHorizontalSwipe({
      onPrevious: isMonthMode ? onPreviousMonth : onPreviousWeek,
      onNext: isMonthMode ? onNextMonth : onNextWeek,
      onSwipeActiveChange,
    });

    useImperativeHandle(
      ref,
      () => ({
        goPrevious: swipe.goPrevious,
        goNext: swipe.goNext,
      }),
      [swipe.goPrevious, swipe.goNext]
    );

    const monthWeeks = useMemo(() => (isMonthMode ? getMonthGridWeeks(selectedDate) : []), [isMonthMode, selectedDate]);

    const renderIndicator = (date: string, isSelected: boolean) => {
      const day = summary[date];
      const total = day?.total ?? 0;
      const completed = day?.completed ?? 0;

      // 未設定: ごく薄い点
      if (total === 0) {
        return <View style={[styles.indicatorEmpty, { backgroundColor: themeColors.border }]} />;
      }
      // 全部達成: 塗りの丸
      if (completed === total) {
        return <View style={[styles.indicator, { backgroundColor: themeColors.primary }]} />;
      }
      // 一部達成: 左半分だけ塗った丸
      if (completed > 0) {
        return (
          <View style={[styles.indicator, styles.indicatorRing, { borderColor: themeColors.primary }]}>
            <View style={[styles.indicatorHalf, { backgroundColor: themeColors.primary }]} />
          </View>
        );
      }
      // 設定済み・未達成: 輪だけ
      return (
        <View
          style={[
            styles.indicator,
            styles.indicatorRing,
            { borderColor: isSelected ? themeColors.primary : themeColors.text.placeholder },
          ]}
        />
      );
    };

    /**
     * 1日分のマス。週モードは曜日ラベル付きの大きめ、月モードはコンパクト
     */
    const renderDayCell = (date: string, weekdayIndex: number, compact: boolean) => {
      const parsed = parseLocalDateString(date);
      const dayNumber = parsed ? parsed.getDate() : 0;
      const monthNumber = parsed ? parsed.getMonth() + 1 : 0;
      const isSelected = date === selectedDate;
      const isToday = date === today;
      const isFuture = date > today;
      const weekdayColor =
        weekdayIndex === 0 ? SUNDAY_COLOR : weekdayIndex === 6 ? SATURDAY_COLOR : themeColors.text.secondary;
      const dayColor = isSelected
        ? themeColors.text.inverse
        : isFuture
          ? themeColors.text.placeholder
          : themeColors.text.primary;

      return (
        <Pressable
          key={date}
          style={[styles.dayCell, compact && styles.dayCellCompact]}
          onPress={() => onSelectDate(date)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`${monthNumber}月${dayNumber}日 ${WEEKDAYS[weekdayIndex]}曜日`}
        >
          {!compact && <Text style={[styles.weekdayText, { color: weekdayColor }]}>{WEEKDAYS[weekdayIndex]}</Text>}
          <View
            style={[
              styles.dayCircle,
              compact && styles.dayCircleCompact,
              isSelected && { backgroundColor: themeColors.primary },
              isToday && !isSelected && [styles.todayRing, { borderColor: themeColors.primary }],
            ]}
          >
            <Text
              style={[
                styles.dayText,
                compact && styles.dayTextCompact,
                { color: dayColor },
                (isSelected || isToday) && { fontFamily: fonts.family.bold },
              ]}
            >
              {dayNumber}
            </Text>
          </View>
          {renderIndicator(date, isSelected)}
        </Pressable>
      );
    };

    return (
      <View style={styles.container}>
        {/* 月モードの曜日ヘッダー（日付だけがスワイプで動くよう固定） */}
        {isMonthMode && (
          <View style={styles.weekdayHeader}>
            {WEEKDAYS.map((label, index) => (
              <View key={label} style={styles.weekdayHeaderCell}>
                <Text
                  style={[
                    styles.weekdayText,
                    styles.weekdayHeaderText,
                    {
                      color: index === 0 ? SUNDAY_COLOR : index === 6 ? SATURDAY_COLOR : themeColors.text.secondary,
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 日付マス（横スワイプで前後の週/月へ） */}
        <Animated.View style={swipe.animatedStyle} {...swipe.panHandlers}>
          {isMonthMode ? (
            monthWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.daysRow}>
                {week.map((date, dayIndex) =>
                  date ? (
                    renderDayCell(date, dayIndex, true)
                  ) : (
                    <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.dayCell} />
                  )
                )}
              </View>
            ))
          ) : (
            <View style={styles.daysRow}>{weekDates.map((date, index) => renderDayCell(date, index, false))}</View>
          )}
        </Animated.View>

        {/* 下段: 今日以外を見ているときだけ「今日に戻る」を右寄せで出す */}
        {!isViewingToday && (
          <View style={styles.footerRow}>
            <Pressable onPress={onGoToToday} hitSlop={8} accessibilityRole="button" accessibilityLabel="今日に戻る">
              <Text style={[styles.todayLink, { color: themeColors.primary }]}>今日に戻る</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

HabitCalendar.displayName = 'HabitCalendar';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayHeaderText: {
    marginBottom: 0,
  },
  daysRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayCellCompact: {
    paddingVertical: 3,
  },
  weekdayText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
    ...textBase,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  dayCircleCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 3,
  },
  todayRing: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  dayTextCompact: {
    fontSize: fonts.size.label,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  indicatorRing: {
    borderWidth: 1.5,
  },
  indicatorHalf: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  indicatorEmpty: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  todayLink: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
});

export default HabitCalendar;
