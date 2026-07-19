/* eslint-disable react-hooks/refs */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { DiaryEntry } from '../../utils/storage';
import { useCalendar } from '../../hooks/useCalendar';
import DiaryCard, { formatDateParts } from './DiaryCard';

const CARD_HEIGHT = 110;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 横スワイプによる月移動の判定・演出パラメータ
const SWIPE_TRIGGER_DISTANCE = 60;
const SWIPE_TRIGGER_VELOCITY = 0.3;
const SLIDE_DISTANCE = 80;
const DRAG_DAMPING = 0.5;
const BLOCKED_DRAG_DAMPING = 0.15;

interface CalendarViewProps {
  selectedYear: number;
  selectedMonth: number;
  filteredDiaries: DiaryEntry[];
  selectedDate: string | null;
  onSelectedDateChange: (date: string | null) => void;
  onNavigateToEntry: (date: string) => void;
  onDelete?: (id: string) => void;
  onSwipePreviousMonth: () => void;
  onSwipeNextMonth: () => void;
  isNextMonthDisabled: boolean;
  /** 横スワイプ中は親ScrollViewの縦スクロールを止めるための通知 */
  onSwipeActiveChange: (isSwiping: boolean) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  selectedYear,
  selectedMonth,
  filteredDiaries,
  selectedDate,
  onSelectedDateChange,
  onNavigateToEntry,
  onDelete,
  onSwipePreviousMonth,
  onSwipeNextMonth,
  isNextMonthDisabled,
  onSwipeActiveChange,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // スワイプ用のアニメーション値（useMemoで安定化）
  const swipeAnim = useMemo(() => new Animated.Value(0), []);
  // 月切り替えアニメーション中は新しいジェスチャーを受け付けない
  const isTransitioningRef = useRef(false);
  // PanResponder コールバックから最新のpropsを参照するためのref
  const onSwipePreviousMonthRef = useRef(onSwipePreviousMonth);
  const onSwipeNextMonthRef = useRef(onSwipeNextMonth);
  const isNextMonthDisabledRef = useRef(isNextMonthDisabled);
  const onSwipeActiveChangeRef = useRef(onSwipeActiveChange);
  useEffect(() => {
    onSwipePreviousMonthRef.current = onSwipePreviousMonth;
    onSwipeNextMonthRef.current = onSwipeNextMonth;
    isNextMonthDisabledRef.current = isNextMonthDisabled;
    onSwipeActiveChangeRef.current = onSwipeActiveChange;
  }, [onSwipePreviousMonth, onSwipeNextMonth, isNextMonthDisabled, onSwipeActiveChange]);

  // アンマウント時に親ScrollViewのスクロールを必ず戻す
  useEffect(() => () => {
    onSwipeActiveChangeRef.current(false);
  }, []);

  // スライドアウト→月変更→反対側からスライドインの演出で月を切り替える
  const runMonthTransition = useCallback(
    (direction: 'previous' | 'next') => {
      isTransitioningRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const outValue = direction === 'next' ? -SLIDE_DISTANCE : SLIDE_DISTANCE;
      Animated.timing(swipeAnim, {
        toValue: outValue,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        if (direction === 'next') {
          onSwipeNextMonthRef.current();
        } else {
          onSwipePreviousMonthRef.current();
        }
        swipeAnim.setValue(-outValue);
        Animated.timing(swipeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          isTransitioningRef.current = false;
        });
      });
    },
    [swipeAnim]
  );

  const resetSwipePosition = useCallback(() => {
    Animated.spring(swipeAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [swipeAnim]);

  // 横スワイプで前後の月へ移動（左スワイプ=次の月、右スワイプ=前の月）
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (isTransitioningRef.current) return false;
          const { dx, dy } = gestureState;
          return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
        },
        // 親（ScrollView）より先に明確な水平スワイプのみキャプチャする
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (isTransitioningRef.current) return false;
          const { dx, dy } = gestureState;
          return Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 15;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          // 横スワイプ中は親ScrollViewの縦スクロールを止めて上下の揺れを防ぐ
          onSwipeActiveChangeRef.current(true);
        },
        onPanResponderMove: (_, gestureState) => {
          const { dx } = gestureState;
          // 次の月へ進めない場合はラバーバンド風に強めに減衰させる
          const blocked = dx < 0 && isNextMonthDisabledRef.current;
          const damping = blocked ? BLOCKED_DRAG_DAMPING : DRAG_DAMPING;
          swipeAnim.setValue(dx * damping);
        },
        onPanResponderRelease: (_, gestureState) => {
          onSwipeActiveChangeRef.current(false);
          const { dx, vx } = gestureState;
          const isNextTriggered =
            dx < 0 &&
            !isNextMonthDisabledRef.current &&
            (dx < -SWIPE_TRIGGER_DISTANCE || vx < -SWIPE_TRIGGER_VELOCITY);
          const isPreviousTriggered =
            dx > 0 && (dx > SWIPE_TRIGGER_DISTANCE || vx > SWIPE_TRIGGER_VELOCITY);

          if (isNextTriggered) {
            runMonthTransition('next');
          } else if (isPreviousTriggered) {
            runMonthTransition('previous');
          } else {
            resetSwipePosition();
          }
        },
        onPanResponderTerminate: () => {
          onSwipeActiveChangeRef.current(false);
          resetSwipePosition();
        },
      }),
    [swipeAnim, runMonthTransition, resetSwipePosition]
  );

  const swipeOpacity = swipeAnim.interpolate({
    inputRange: [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  const { weeks, selectedDiary, handleDayPress, diaryCount } =
    useCalendar({
      selectedYear,
      selectedMonth,
      filteredDiaries,
      selectedDate,
      onSelectedDateChange,
    });

  const renderSelectedDateCard = () => {
    if (!selectedDate) return null;

    const dateParts = formatDateParts(selectedDate);
    const dateSectionStyle =
      dateParts.dayOfWeek === 0
        ? styles.dateSectionSunday
        : dateParts.dayOfWeek === 6
          ? styles.dateSectionSaturday
          : null;
    const dateTextStyle =
      dateParts.dayOfWeek === 0
        ? styles.sundayText
        : dateParts.dayOfWeek === 6
          ? styles.saturdayText
          : null;

    if (selectedDiary) {
      return (
        <View style={[styles.selectedCardContainer, { borderTopColor: themeColors.border }]}>
          <DiaryCard
            entry={selectedDiary}
            onPress={() => onNavigateToEntry(selectedDate)}
            onDelete={onDelete}
          />
        </View>
      );
    }

    // 日記がない場合は新規作成ボタンを表示
    return (
      <View style={[styles.selectedCardContainer, { borderTopColor: themeColors.border }]}>
        <View style={[styles.noEntryCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={[styles.dateSection, dateSectionStyle]}>
            <Text style={[styles.weekdayText, { color: themeColors.text.secondary }, dateTextStyle]}>
              {dateParts.weekday}
            </Text>
            <Text style={[styles.dayText, { color: themeColors.text.primary }, dateTextStyle]}>{dateParts.day}</Text>
          </View>
          <View style={styles.noEntryContent}>
            <Text style={[styles.noEntryText, { color: themeColors.text.secondary }]}>この日の記録はありません</Text>
            <TouchableOpacity
              style={[styles.createEntryButton, { backgroundColor: themeColors.primary }]}
              onPress={() => onNavigateToEntry(selectedDate)}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={themeColors.text.inverse}
              />
              <Text style={[styles.createEntryButtonText, { color: themeColors.text.inverse }]}>日記を書く</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* カレンダー表示エリア（横スワイプで前後の月へ移動） */}
      <Animated.View
        style={{ transform: [{ translateX: swipeAnim }], opacity: swipeOpacity }}
        {...panResponder.panHandlers}
      >
        {/* 曜日ヘッダー */}
        <View style={styles.weekdayHeader}>
          {WEEKDAYS.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayHeaderText,
                  { color: themeColors.text.secondary },
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* カレンダーグリッド */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.days.map((calendarDay, dayIndex) => {
              const { day, hasDiary, dateString, isToday, isFuture, dayOfWeek } =
                calendarDay;
              const isSelected = dateString === selectedDate;

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={styles.dayCell}
                  onPress={() => day !== null && handleDayPress(day)}
                  disabled={day === null || isFuture}
                >
                  {day !== null && (
                    <View
                      style={[
                        styles.dayContent,
                        hasDiary && !isToday && !isSelected && { backgroundColor: `${themeColors.primary}40` },
                        isToday && { backgroundColor: themeColors.primary },
                        isSelected && !isToday && { backgroundColor: themeColors.text.secondary },
                        isFuture && styles.futureDayContent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          { color: themeColors.text.primary },
                          dayOfWeek === 0 && !hasDiary && !isToday && !isSelected && !isFuture && styles.sundayText,
                          dayOfWeek === 6 && !hasDiary && !isToday && !isSelected && !isFuture && styles.saturdayText,
                          hasDiary && !isToday && !isSelected && { color: themeColors.primary, fontFamily: fonts.family.bold },
                          isToday && { color: themeColors.text.inverse, fontFamily: fonts.family.bold },
                          isSelected && !isToday && { color: themeColors.text.inverse, fontFamily: fonts.family.bold },
                          isFuture && { color: themeColors.text.secondary },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* 選択された日付のカード表示 */}
      {renderSelectedDateCard()}

      {/* この月の記録サマリー */}
      {!selectedDate && (
        <View style={[styles.calendarSummary, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.summaryText, { color: themeColors.text.secondary }]}>この月の記録: {diaryCount}件</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.padding.screen,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayHeaderText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.borderRadius.small,
  },
  hasDiaryContent: {},
  todayContent: {},
  selectedContent: {},
  futureDayContent: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  hasDiaryText: {},
  todayText: {},
  selectedText: {},
  sundayText: {
    color: '#E57373',
  },
  saturdayText: {
    color: '#64B5F6',
  },
  selectedCardContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderWidth,
  },
  noEntryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    padding: spacing.sm,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  dateSection: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  dateSectionSunday: {},
  dateSectionSaturday: {},
  dayText: {
    fontSize: 20,
    fontWeight: fonts.weight.semibold,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  weekdayText: {
    fontSize: 10,
    fontFamily: fonts.family.regular,
    marginBottom: 2,
    ...textBase,
  },
  noEntryContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  noEntryText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.sm,
    ...textBase,
  },
  createEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.small,
    gap: spacing.xs,
  },
  createEntryButtonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  calendarSummary: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderWidth,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default CalendarView;
