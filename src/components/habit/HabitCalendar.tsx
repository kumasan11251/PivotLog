/* eslint-disable react-hooks/refs */
import React, { useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import { parseLocalDateString, getMonthGridWeeks } from '../../utils/dateUtils';
import type { HabitSummaryByDate } from '../../hooks/useDailyHabits';
import type { HabitCalendarMode } from '../../types/habit';
import { fonts, spacing, textBase, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const SUNDAY_COLOR = '#E57373';
const SATURDAY_COLOR = '#64B5F6';

// 横スワイプによる週/月移動の判定・演出パラメータ
const SWIPE_TRIGGER_DISTANCE = 50;
const SWIPE_TRIGGER_VELOCITY = 0.3;
const SLIDE_DISTANCE = 60;
const DRAG_DAMPING = 0.4;

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

    const swipeAnim = useMemo(() => new Animated.Value(0), []);
    const isTransitioningRef = useRef(false);
    // PanResponder コールバックから最新のpropsを参照するためのref
    const onPreviousRef = useRef(isMonthMode ? onPreviousMonth : onPreviousWeek);
    const onNextRef = useRef(isMonthMode ? onNextMonth : onNextWeek);
    const onSwipeActiveChangeRef = useRef(onSwipeActiveChange);
    useEffect(() => {
      onPreviousRef.current = isMonthMode ? onPreviousMonth : onPreviousWeek;
      onNextRef.current = isMonthMode ? onNextMonth : onNextWeek;
      onSwipeActiveChangeRef.current = onSwipeActiveChange;
    }, [isMonthMode, onPreviousWeek, onNextWeek, onPreviousMonth, onNextMonth, onSwipeActiveChange]);

    // アンマウント時に親ScrollViewのスクロールを必ず戻す
    useEffect(
      () => () => {
        onSwipeActiveChangeRef.current?.(false);
      },
      []
    );

    // スライドアウト → 期間変更 → 反対側からスライドイン
    const runTransition = useCallback(
      (direction: 'previous' | 'next') => {
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const outValue = direction === 'next' ? -SLIDE_DISTANCE : SLIDE_DISTANCE;
        Animated.timing(swipeAnim, { toValue: outValue, duration: 100, useNativeDriver: true }).start(() => {
          if (direction === 'next') {
            onNextRef.current();
          } else {
            onPreviousRef.current();
          }
          swipeAnim.setValue(-outValue);
          Animated.timing(swipeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
            isTransitioningRef.current = false;
          });
        });
      },
      [swipeAnim]
    );

    useImperativeHandle(
      ref,
      () => ({
        goPrevious: () => runTransition('previous'),
        goNext: () => runTransition('next'),
      }),
      [runTransition]
    );

    const resetSwipePosition = useCallback(() => {
      Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    }, [swipeAnim]);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_, { dx, dy }) =>
            !isTransitioningRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
          onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
            !isTransitioningRef.current && Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 15,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            // 横スワイプ中は親ScrollViewの縦スクロールを止めて上下の揺れを防ぐ
            onSwipeActiveChangeRef.current?.(true);
          },
          onPanResponderMove: (_, { dx }) => {
            swipeAnim.setValue(dx * DRAG_DAMPING);
          },
          onPanResponderRelease: (_, { dx, vx }) => {
            onSwipeActiveChangeRef.current?.(false);
            if (dx < 0 && (dx < -SWIPE_TRIGGER_DISTANCE || vx < -SWIPE_TRIGGER_VELOCITY)) {
              runTransition('next');
            } else if (dx > 0 && (dx > SWIPE_TRIGGER_DISTANCE || vx > SWIPE_TRIGGER_VELOCITY)) {
              runTransition('previous');
            } else {
              resetSwipePosition();
            }
          },
          onPanResponderTerminate: () => {
            onSwipeActiveChangeRef.current?.(false);
            resetSwipePosition();
          },
        }),
      [swipeAnim, runTransition, resetSwipePosition]
    );

    const swipeOpacity = swipeAnim.interpolate({
      inputRange: [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE],
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

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
        <Animated.View
          style={{ transform: [{ translateX: swipeAnim }], opacity: swipeOpacity }}
          {...panResponder.panHandlers}
        >
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
