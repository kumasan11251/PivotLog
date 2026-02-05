/**
 * ストリーク計算ユーティリティ
 * useTodayDiary フック外でも使えるように純粋関数として分離
 */

import type { DiaryEntry } from './storage';
import { getEffectiveTodayDate } from './dateUtils';

/**
 * ストリーク計算の結果
 */
export interface StreakResult {
  streakDays: number;
  totalDays: number;
}

/**
 * 日記エントリの配列からストリーク（連続記録日数）を計算する
 * @param diaries 日記エントリの配列
 * @param dayStartHour 1日の開始時刻（0-12、デフォルト0）
 */
export const calculateStreakFromEntries = (
  diaries: DiaryEntry[],
  dayStartHour: number = 0
): StreakResult => {
  const totalDays = diaries.length;

  if (totalDays === 0) {
    return { streakDays: 0, totalDays: 0 };
  }

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
    return { streakDays: 0, totalDays };
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
      break;
    }
  }

  return { streakDays: streak, totalDays };
};

/**
 * ストリーク日数に応じたマイルストーン絵文字を取得
 * @param days 連続記録日数
 */
export const getStreakEmoji = (days: number): string => {
  if (days >= 365) return '🏆';
  if (days >= 100) return '💎';
  if (days >= 30) return '🌟';
  if (days >= 14) return '✨';
  if (days >= 7) return '🎉';
  if (days >= 3) return '🔥';
  if (days > 0) return '📝';
  return '';
};
