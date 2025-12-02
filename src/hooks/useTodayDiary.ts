import { useState, useEffect, useCallback } from 'react';
import { getDiaryByDate, loadDiaryEntries, DiaryEntry } from '../utils/storage';

interface TodayDiaryState {
  /** 今日の日記があるかどうか */
  hasTodayEntry: boolean;
  /** 連続記録日数 */
  streakDays: number;
  /** ローディング中かどうか */
  isLoading: boolean;
  /** データを再読み込み */
  refresh: () => Promise<void>;
}

/**
 * 今日の日記の状態と連続記録日数を管理するフック
 */
export const useTodayDiary = (): TodayDiaryState => {
  const [hasTodayEntry, setHasTodayEntry] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const getTodayDateString = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const calculateStreak = useCallback((diaries: DiaryEntry[]): number => {
    if (diaries.length === 0) return 0;

    // 日付でソート（降順）
    const sortedDiaries = [...diaries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayString = getTodayDateString();
      
      // 今日の日記を取得
      const todayEntry = await getDiaryByDate(todayString);
      setHasTodayEntry(todayEntry !== null);

      // 全日記を取得してストリーク計算
      const allDiaries = await loadDiaryEntries();
      const streak = calculateStreak(allDiaries);
      setStreakDays(streak);
    } catch (error) {
      console.error('今日の日記状態の取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getTodayDateString, calculateStreak]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    hasTodayEntry,
    streakDays,
    isLoading,
    refresh,
  };
};
