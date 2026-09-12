import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from './common/ScreenHeader';
import PeriodSelectorBar, { type PeriodSelectorSegment } from './common/PeriodSelectorBar';
import YearMonthPickerModal from './diary/YearMonthPickerModal';
import HabitCalendar, { type HabitCalendarHandle } from './habit/HabitCalendar';
import HabitList, { type HabitListHandle } from './habit/HabitList';
import { useDailyHabits } from '../hooks/useDailyHabits';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { addDaysToDateString, formatJapaneseMonthDay, parseLocalDateString } from '../utils/dateUtils';
import type { HomeScreenNavigationProp } from '../types/navigation';
import type { HabitCalendarMode } from '../types/habit';
import { fonts, spacing, textBase, getColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

// AndroidでLayoutAnimationを有効にする（旧アーキテクチャ向け。新アーキテクチャでは未定義）
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** ヘッダー下バーの表示切り替え。記録一覧はアイコン、習慣は「週」「月」の文字 */
const CALENDAR_MODE_SEGMENTS: PeriodSelectorSegment<HabitCalendarMode>[] = [
  { value: 'week', label: '週', accessibilityLabel: '週表示' },
  { value: 'month', label: '月', accessibilityLabel: '月表示' },
];

interface HabitContentProps {
  /** タブが表示中かどうか（表示されたタイミングで再読み込みする） */
  isActive: boolean;
}

const HabitContent: React.FC<HabitContentProps> = ({ isActive }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const dailyListRef = useRef<HabitListHandle>(null);
  const calendarRef = useRef<HabitCalendarHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  // フォーカス中の入力行（追加行・編集行）。blur で null に戻す
  const focusedRowRef = useRef<React.RefObject<View | null> | null>(null);
  const scrollToRowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReduceMotion();
  const [isYearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);
  // カレンダーを横スワイプしている間は縦スクロールを止める（記録一覧と同じ）
  const [isCalendarSwiping, setIsCalendarSwiping] = useState(false);

  // 全項目完了時の演出: ヒント文がふわっと入れ替わり、カウント表示が少し弾む
  const hintAnim = useMemo(() => new Animated.Value(1), []);
  const countScale = useMemo(() => new Animated.Value(1), []);

  const handleAllCompleted = () => {
    if (reduceMotion) return;
    hintAnim.setValue(0);
    countScale.setValue(1);
    Animated.parallel([
      Animated.timing(hintAnim, {
        toValue: 1,
        duration: 480,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(countScale, {
          toValue: 1.15,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(countScale, {
          toValue: 1,
          damping: 10,
          stiffness: 220,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const {
    today,
    selectedDate,
    isToday,
    isFuture,
    weekDates,
    summary,
    calendarMode,
    items,
    completedCount,
    canAdd,
    maxCount,
    previousDayDate,
    suggestions,
    selectDate,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
    setCalendarMode,
    addHabit,
    addHabits,
    toggleHabit,
    updateHabitTitle,
    removeHabit,
    reload,
  } = useDailyHabits();

  // タブが表示されたら再読み込み（日付が変わっている可能性があるため）
  useEffect(() => {
    if (isActive) {
      void reload();
    }
  }, [isActive, reload]);

  // フォーカス中の入力行を画面上部へ寄せて、キーボードに隠れないようにする（日記入力画面と同じ考え方）
  const scrollFocusedRowIntoView = useCallback(() => {
    const row = focusedRowRef.current?.current;
    const content = scrollContentRef.current;
    if (!row || !content) return;
    row.measureLayout(
      content as unknown as React.ElementRef<typeof View>,
      (_fx, fy) => scrollViewRef.current?.scrollTo({ y: Math.max(0, fy - spacing.lg), animated: true }),
      () => undefined
    );
  }, []);

  const clearScrollToRowTimer = () => {
    if (scrollToRowTimerRef.current) {
      clearTimeout(scrollToRowTimerRef.current);
      scrollToRowTimerRef.current = null;
    }
  };

  // 入力欄がフォーカスされたら少し待ってスクロール（行のレイアウト確定とキーボード表示を待つ）
  const handleInputFocus = (rowRef: React.RefObject<View | null>) => {
    focusedRowRef.current = rowRef;
    clearScrollToRowTimer();
    scrollToRowTimerRef.current = setTimeout(() => {
      scrollToRowTimerRef.current = null;
      scrollFocusedRowIntoView();
    }, Platform.OS === 'ios' ? 50 : 150);
  };

  const handleInputBlur = () => {
    focusedRowRef.current = null;
    clearScrollToRowTimer();
  };

  // キーボードが出きったあとにも一度寄せ直す（表示前のスクロールでは可動域が足りず届かないことがある）
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (focusedRowRef.current) scrollFocusedRowIntoView();
    });
    return () => subscription.remove();
  }, [scrollFocusedRowIntoView]);

  useEffect(() => () => clearScrollToRowTimer(), []);

  // 日付を切り替える前に、入力中・編集中の内容を確定しておく
  const commitPendingInput = () => {
    dailyListRef.current?.commitPending();
    Keyboard.dismiss();
  };

  const withCommit = (action: () => void) => () => {
    commitPendingInput();
    action();
  };

  const handleSelectDate = (date: string) => {
    commitPendingInput();
    selectDate(date);
  };

  // 週⇄月の切り替え（一覧側がなめらかに押し下がる/戻るようにレイアウトをアニメーション）
  const handleChangeCalendarMode = (mode: HabitCalendarMode) => {
    if (mode === calendarMode) return;
    commitPendingInput();
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setCalendarMode(mode);
  };

  const handleConfirmYearMonth = (year: number, month: number) => {
    commitPendingInput();
    goToMonth(year, month);
  };

  // ヘッダー下バーに出す年月（選択日の月）
  const selectedParsed = parseLocalDateString(selectedDate);
  const selectedYear = selectedParsed?.getFullYear() ?? new Date().getFullYear();
  const selectedMonth = (selectedParsed?.getMonth() ?? new Date().getMonth()) + 1;
  const isMonthMode = calendarMode === 'month';

  const allCompleted = items.length > 0 && completedCount === items.length;

  // 選択日に応じた見出し（今日 / 明日 / 昨日 / 9月3日）
  // 日付の行は置かないので、遠い日はここで日付を示す
  const dayLabel = isToday
    ? '今日'
    : selectedDate === addDaysToDateString(today, 1)
      ? '明日'
      : selectedDate === addDaysToDateString(today, -1)
        ? '昨日'
        : formatJapaneseMonthDay(selectedDate);

  // 引き継ぎ元のラベル（前日 / 9月7日）
  const suggestionLabel = previousDayDate
    ? previousDayDate === addDaysToDateString(selectedDate, -1)
      ? '前日の項目から'
      : `${formatJapaneseMonthDay(previousDayDate)}の項目から`
    : '';

  const hintText = (() => {
    if (isFuture) {
      return items.length === 0
        ? `予定として＋から${maxCount}つまで書けます。チェックは当日になってから。`
        : 'チェックは当日になってからできます。';
    }
    if (items.length === 0) {
      return `＋から${maxCount}つまで書けます。やりとげたら項目をタップしてチェック。`;
    }
    if (allCompleted) {
      return `${dayLabel}のやりとげたいこと、すべて完了しました。`;
    }
    return 'やりとげたら項目をタップしてチェック。';
  })();

  // カードの上部に置く見出し（HabitList がカードの中に描く）
  const listHeader = (
    <>
      {/* 見出しと達成数を同じ行に（日付はカレンダーの選択で伝わるので置かない） */}
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>{dayLabel}、やりとげたいこと</Text>
        {items.length > 0 && (
          <Animated.Text
            style={[
              styles.countLabel,
              {
                color: allCompleted ? themeColors.primary : themeColors.text.secondary,
                transform: [{ scale: countScale }],
              },
            ]}
          >
            {completedCount} / {items.length} 完了
          </Animated.Text>
        )}
      </View>
      <Animated.Text
        style={[
          styles.hint,
          {
            color: allCompleted ? themeColors.primary : themeColors.text.secondary,
            opacity: hintAnim,
            transform: [
              {
                translateY: hintAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          },
        ]}
      >
        {hintText}
      </Animated.Text>
    </>
  );

  return (
    <Pressable
      style={[styles.container, { backgroundColor: themeColors.background }]}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <ScreenHeader
        title="習慣"
        rightAction={{
          type: 'settings',
          onPress: () => navigation.navigate('Settings'),
        }}
      />
      {/* 記録一覧と同じ構成のバー: 年月ナビ ＋ 週/月切り替え。矢印は表示中の単位で動く */}
      <PeriodSelectorBar
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onPrevious={() => calendarRef.current?.goPrevious()}
        onNext={() => calendarRef.current?.goNext()}
        onMonthPress={() => {
          commitPendingInput();
          setYearMonthPickerVisible(true);
        }}
        previousAccessibilityLabel={isMonthMode ? '前の月' : '前の週'}
        nextAccessibilityLabel={isMonthMode ? '次の月' : '次の週'}
        segments={CALENDAR_MODE_SEGMENTS}
        value={calendarMode}
        onChange={handleChangeCalendarMode}
      />
      {/*
        記録一覧と同じく、年月バーより下はカレンダーも含めて全体をスクロール。
        キーボードが出たときにカレンダーを上へ送って、記入スペースを確保できるようにする
      */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isCalendarSwiping}
        automaticallyAdjustKeyboardInsets
      >
        <View ref={scrollContentRef}>
          <HabitCalendar
            ref={calendarRef}
            mode={calendarMode}
            weekDates={weekDates}
            selectedDate={selectedDate}
            today={today}
            summary={summary}
            onSelectDate={handleSelectDate}
            onPreviousWeek={withCommit(goToPreviousWeek)}
            onNextWeek={withCommit(goToNextWeek)}
            onPreviousMonth={withCommit(goToPreviousMonth)}
            onNextMonth={withCommit(goToNextMonth)}
            onGoToToday={withCommit(goToToday)}
            onSwipeActiveChange={setIsCalendarSwiping}
          />

          <View style={[styles.listSection, { borderTopColor: themeColors.border }]}>
            <HabitList
              ref={dailyListRef}
              header={listHeader}
              items={items}
              canAdd={canAdd}
              maxCount={maxCount}
              canToggle={!isFuture}
              itemNoun="やりとげたいこと"
              removeContextLabel={`${dayLabel}のやりとげたいこと`}
              suggestions={suggestions}
              suggestionLabel={suggestionLabel}
              onAdd={addHabit}
              onAddMany={addHabits}
              onToggle={toggleHabit}
              onUpdateTitle={updateHabitTitle}
              onRemove={removeHabit}
              onAllCompleted={handleAllCompleted}
              onInputFocus={handleInputFocus}
              onInputBlur={handleInputBlur}
            />
          </View>
        </View>
      </ScrollView>

      <YearMonthPickerModal
        visible={isYearMonthPickerVisible}
        initialYear={selectedYear}
        initialMonth={selectedMonth}
        allowFuture
        onClose={() => setYearMonthPickerVisible(false)}
        onConfirm={handleConfirmYearMonth}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  // カレンダーとの間は記録一覧のカード上部と同じ細い区切り線
  listSection: {
    marginHorizontal: spacing.padding.screen,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: spacing.borderWidth,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: fonts.size.sectionTitle,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  countLabel: {
    flexShrink: 0,
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  hint: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
    marginBottom: spacing.md,
    ...textBase,
  },
});

export default HabitContent;
