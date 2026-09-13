import { useState, useCallback, useEffect, useRef } from 'react';
import { loadUserSettings } from '../utils/storage';
import {
  loadHabitsForDates,
  saveHabitsByDate,
  syncHabitsFromFirestore,
  findPreviousHabitDay,
  loadHabitCalendarMode,
  saveHabitCalendarMode,
} from '../utils/habitStorage';
import {
  getEffectiveToday,
  getWeekDateStrings,
  getMonthGridDateStrings,
  addDaysToDateString,
  addMonthsToDateString,
  parseLocalDateString,
  formatDateToString,
} from '../utils/dateUtils';
import {
  addHabitItem,
  addHabitItems,
  toggleHabitItem,
  updateHabitItemTitle,
  removeHabitItem,
  filterHabitSuggestions,
} from '../utils/habitListOps';
import type { HabitItem, HabitsByDate, HabitCalendarMode } from '../types/habit';
import { MAX_HABITS_PER_DAY } from '../types/habit';

/** 日ごとの達成度サマリー（カレンダーの表示用） */
export interface HabitDaySummary {
  total: number;
  completed: number;
}

/** 日付（YYYY-MM-DD）→ 達成度サマリー */
export type HabitSummaryByDate = Record<string, HabitDaySummary>;

/** 引き継ぎ元（選択日より前でいちばん最近項目があった日） */
export interface PreviousHabitDay {
  date: string;
  items: HabitItem[];
}

const summarize = (byDate: HabitsByDate): HabitSummaryByDate => {
  const result: HabitSummaryByDate = {};
  for (const [date, items] of Object.entries(byDate)) {
    result[date] = {
      total: items.length,
      completed: items.filter((item) => item.completed).length,
    };
  }
  return result;
};

/**
 * 習慣（やりとげたいこと）を日付単位で管理するフック
 * - 「1日の開始時刻」設定を考慮した今日を基準にする
 * - 上部カレンダー（週ストリップ / 月グリッド）で他の日を選択して閲覧・編集できる
 * - 未来の日は追加・編集のみ可能で、完了チェックは当日から
 */
export const useDailyHabits = () => {
  const initialToday = getEffectiveToday(0);
  const [today, setToday] = useState<string>(initialToday);
  const [selectedDate, setSelectedDate] = useState<string>(initialToday);
  const [items, setItems] = useState<HabitItem[]>([]);
  const [summary, setSummary] = useState<HabitSummaryByDate>({});
  const [previousDay, setPreviousDay] = useState<PreviousHabitDay | null>(null);
  const [calendarMode, setCalendarModeState] = useState<HabitCalendarMode>('week');
  const [isLoading, setIsLoading] = useState(true);

  // blur による確定と別ボタンのタップが同じレンダー内で連続しても
  // 互いの更新を上書きしないよう、最新値を同期的に保持する
  const itemsRef = useRef<HabitItem[]>([]);
  const dateRef = useRef<string>(initialToday);
  const todayRef = useRef<string>(initialToday);
  // 「今日」を表示中なら、日付が変わったときに自動で新しい今日へ追従する
  const followTodayRef = useRef(true);

  const loadDate = useCallback(async (date: string) => {
    // 月グリッドが覆う範囲（週単位）を読むので、週ストリップの7日分も必ず含まれる
    const gridDates = getMonthGridDateStrings(date);
    const [byDate, previous] = await Promise.all([
      loadHabitsForDates(gridDates),
      findPreviousHabitDay(date),
    ]);
    dateRef.current = date;
    itemsRef.current = byDate[date] ?? [];
    setItems(itemsRef.current);
    setSummary(summarize(byDate));
    setPreviousDay(previous);
  }, []);

  const reload = useCallback(async () => {
    try {
      const settings = await loadUserSettings();
      const effectiveToday = getEffectiveToday(settings?.dayStartHour ?? 0);
      todayRef.current = effectiveToday;
      setToday(effectiveToday);
      const target = followTodayRef.current ? effectiveToday : dateRef.current;
      setSelectedDate(target);
      // まずキャッシュから即座に表示し、その後 Firestore で最新化できたら表示し直す
      await loadDate(target);
      setIsLoading(false);
      const synced = await syncHabitsFromFirestore();
      if (synced) {
        // 同期中にユーザーが別の日へ移動していても、現在の選択日を読み直す
        await loadDate(dateRef.current);
      }
    } catch (error) {
      console.error('Failed to reload habits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 表示モードは端末に記憶したものを復元する
  useEffect(() => {
    let mounted = true;
    void loadHabitCalendarMode().then((mode) => {
      if (mounted) setCalendarModeState(mode);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setCalendarMode = useCallback((mode: HabitCalendarMode) => {
    setCalendarModeState(mode);
    void saveHabitCalendarMode(mode);
  }, []);

  const selectDate = useCallback(
    (date: string) => {
      followTodayRef.current = date === todayRef.current;
      setSelectedDate(date);
      void loadDate(date);
    },
    [loadDate]
  );

  const goToToday = useCallback(() => selectDate(todayRef.current), [selectDate]);
  const goToPreviousDay = useCallback(
    () => selectDate(addDaysToDateString(dateRef.current, -1)),
    [selectDate]
  );
  const goToNextDay = useCallback(() => selectDate(addDaysToDateString(dateRef.current, 1)), [selectDate]);
  const goToPreviousWeek = useCallback(
    () => selectDate(addDaysToDateString(dateRef.current, -7)),
    [selectDate]
  );
  const goToNextWeek = useCallback(
    () => selectDate(addDaysToDateString(dateRef.current, 7)),
    [selectDate]
  );
  const goToPreviousMonth = useCallback(
    () => selectDate(addMonthsToDateString(dateRef.current, -1)),
    [selectDate]
  );
  const goToNextMonth = useCallback(
    () => selectDate(addMonthsToDateString(dateRef.current, 1)),
    [selectDate]
  );
  /** 年月ピッカーからの移動。今月なら今日、それ以外は同じ日付（月末で丸め）へ */
  const goToMonth = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      if (todayRef.current.startsWith(prefix)) {
        selectDate(todayRef.current);
        return;
      }
      const current = parseLocalDateString(dateRef.current);
      const day = current ? current.getDate() : 1;
      const lastDay = new Date(year, month, 0).getDate();
      selectDate(formatDateToString(new Date(year, month - 1, Math.min(day, lastDay))));
    },
    [selectDate]
  );

  const persist = useCallback((next: HabitItem[]) => {
    const date = dateRef.current;
    itemsRef.current = next;
    setItems(next);
    setSummary((prev) => ({
      ...prev,
      [date]: {
        total: next.length,
        completed: next.filter((item) => item.completed).length,
      },
    }));
    void saveHabitsByDate(date, next);
  }, []);

  const addHabit = useCallback(
    (title: string): boolean => {
      const next = addHabitItem(itemsRef.current, title);
      if (!next) return false;
      persist(next);
      return true;
    },
    [persist]
  );

  const addHabits = useCallback(
    (titles: string[]): number => {
      const { list, added } = addHabitItems(itemsRef.current, titles);
      if (added > 0) persist(list);
      return added;
    },
    [persist]
  );

  const toggleHabit = useCallback(
    (id: string) => {
      // 未来の日は完了チェックできない
      if (dateRef.current > todayRef.current) return;
      persist(toggleHabitItem(itemsRef.current, id));
    },
    [persist]
  );

  const updateHabitTitle = useCallback(
    (id: string, title: string): boolean => {
      const next = updateHabitItemTitle(itemsRef.current, id, title);
      if (!next) return false;
      persist(next);
      return true;
    },
    [persist]
  );

  const removeHabit = useCallback(
    (id: string) => {
      const next = removeHabitItem(itemsRef.current, id);
      if (next) persist(next);
    },
    [persist]
  );

  const completedCount = items.filter((item) => item.completed).length;
  const suggestions = previousDay ? filterHabitSuggestions(previousDay.items, items) : [];

  return {
    today,
    selectedDate,
    isToday: selectedDate === today,
    isFuture: selectedDate > today,
    weekDates: getWeekDateStrings(selectedDate),
    summary,
    calendarMode,
    items,
    isLoading,
    completedCount,
    canAdd: items.length < MAX_HABITS_PER_DAY,
    maxCount: MAX_HABITS_PER_DAY,
    previousDayDate: previousDay?.date ?? null,
    suggestions,
    selectDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
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
  };
};
