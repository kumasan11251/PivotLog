import { useState, useEffect, useCallback, useRef } from 'react';
import { getDiaryByDate, loadDiaryEntries, DiaryEntry } from '../utils/storage';
import { getEffectiveToday, getEffectiveTodayDate } from '../utils/dateUtils';

// マイルストーンの日数（連続記録）
const STREAK_MILESTONE_DAYS = [3, 7, 14, 30, 100, 365];
// 総記録日数のマイルストーン
const TOTAL_MILESTONE_DAYS = [10, 50, 100, 200, 365, 500, 1000];

interface TodayDiaryState {
  /** 今日の日記があるかどうか */
  hasTodayEntry: boolean;
  /** 連続記録日数 */
  streakDays: number;
  /** 総記録日数 */
  totalDays: number;
  /** ローディング中かどうか */
  isLoading: boolean;
  /** 今記録が完了したばかりか（祝福表示用） */
  justCompleted: boolean;
  /** 達成した連続記録マイルストーン（日数）。達成時のみ値が入る */
  achievedMilestone: number | null;
  /** 達成した総記録マイルストーン（日数）。達成時のみ値が入る */
  achievedTotalMilestone: number | null;
  /** 連続記録が途切れて再開した場合true */
  isRestarting: boolean;
  /** 祝福表示完了を通知 */
  clearJustCompleted: () => void;
  /** データを再読み込み */
  refresh: () => Promise<void>;
}

interface UseTodayDiaryOptions {
  /** 1日の開始時刻（0-12） */
  dayStartHour?: number;
}

/**
 * 今日の日記の状態と連続記録日数を管理するフック
 * @param options.dayStartHour 1日の開始時刻（デフォルト: 0）
 */
export const useTodayDiary = (options: UseTodayDiaryOptions = {}): TodayDiaryState => {
  const { dayStartHour = 0 } = options;
  const [hasTodayEntry, setHasTodayEntry] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);
  const [achievedMilestone, setAchievedMilestone] = useState<number | null>(null);
  const [achievedTotalMilestone, setAchievedTotalMilestone] = useState<number | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  // 前回の記録状態、ストリーク日数、総日数を追跡
  const hadEntryBeforeRef = useRef<boolean | null>(null);
  const previousStreakRef = useRef<number>(0);
  const previousTotalRef = useRef<number>(0);

  const getTodayDateString = useCallback(() => {
    return getEffectiveToday(dayStartHour);
  }, [dayStartHour]);

  const calculateStreak = useCallback((diaries: DiaryEntry[]): number => {
    if (diaries.length === 0) return 0;

    // 日付でソート（降順）
    const sortedDiaries = [...diaries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // dayStartHour を考慮した「今日」を取得
    const today = getEffectiveTodayDate(dayStartHour);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 最新の日記が今日か昨日でなければストリークは0
    const latestDate = new Date(sortedDiaries[0].date);
    latestDate.setHours(0, 0, 0, 0);

    if (latestDate.getTime() !== today.getTime() && latestDate.getTime() !== yesterday.getTime()) {
      return 0;
    }

    let streak = 0;
    let checkDate = latestDate;

    for (const diary of sortedDiaries) {
      const diaryDate = new Date(diary.date);
      diaryDate.setHours(0, 0, 0, 0);

      if (diaryDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (diaryDate.getTime() < checkDate.getTime()) {
        // 日付が飛んでいたらストリーク終了
        break;
      }
      // 同じ日付は無視（重複の場合）
    }

    return streak;
  }, [dayStartHour]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayString = getTodayDateString();

      // 今日の日記を取得
      const todayEntry = await getDiaryByDate(todayString);
      const hasEntry = todayEntry !== null;

      // 全日記を取得してストリーク計算
      const allDiaries = await loadDiaryEntries();
      const streak = calculateStreak(allDiaries);
      const total = allDiaries.length;

      // 前回は記録がなく、今回記録がある場合 = 今記録が完了した
      if (hadEntryBeforeRef.current === false && hasEntry) {
        setJustCompleted(true);

        // 連続記録が途切れて再開した場合（前回ストリーク > 1 で今回ストリーク = 1）
        const previousStreak = previousStreakRef.current;
        if (previousStreak > 1 && streak === 1) {
          setIsRestarting(true);
        } else {
          setIsRestarting(false);

          // 連続記録マイルストーン達成チェック
          const streakMilestone = STREAK_MILESTONE_DAYS.find(
            (days) => previousStreak < days && streak >= days
          );
          if (streakMilestone) {
            setAchievedMilestone(streakMilestone);
          }
        }

        // 総記録マイルストーン達成チェック（再開時も含む）
        const previousTotal = previousTotalRef.current;
        const totalMilestone = TOTAL_MILESTONE_DAYS.find(
          (days) => previousTotal < days && total >= days
        );
        if (totalMilestone) {
          setAchievedTotalMilestone(totalMilestone);
        }
      }

      // 現在の状態を保存
      hadEntryBeforeRef.current = hasEntry;
      previousStreakRef.current = streak;
      previousTotalRef.current = total;
      setHasTodayEntry(hasEntry);
      setStreakDays(streak);
      setTotalDays(total);
    } catch (error) {
      console.error('今日の日記状態の取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getTodayDateString, calculateStreak]);

  const clearJustCompleted = useCallback(() => {
    setJustCompleted(false);
    setAchievedMilestone(null);
    setAchievedTotalMilestone(null);
    setIsRestarting(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    hasTodayEntry,
    streakDays,
    totalDays,
    isLoading,
    justCompleted,
    achievedMilestone,
    achievedTotalMilestone,
    isRestarting,
    clearJustCompleted,
    refresh,
  };
};
