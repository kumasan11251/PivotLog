/**
 * ホーム画面用のヘルパー関数
 */

import {
  WEEKDAYS,
  DAILY_MESSAGES,
  CELEBRATION_MESSAGES,
  RESTART_MESSAGES,
} from '../constants/home';

/**
 * 今日の日付を日本語形式で取得
 * @returns "12月4日（水）" のような形式
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const weekday = WEEKDAYS[today.getDay()];
  return `${month}月${day}日（${weekday}）`;
};

/**
 * 誕生日かどうかをチェック
 * @param birthday YYYY-MM-DD形式の誕生日
 */
export const isBirthday = (birthday: string): boolean => {
  const today = new Date();
  const [, birthMonth, birthDay] = birthday.split('-').map(Number);
  return today.getMonth() + 1 === birthMonth && today.getDate() === birthDay;
};

/**
 * 日替わり挨拶メッセージを取得
 * 同じ日は同じメッセージを返す（日付ベースでインデックス決定）
 * @param isBirthdayToday 今日が誕生日かどうか
 */
export const getGreeting = (isBirthdayToday: boolean): string => {
  if (isBirthdayToday) {
    return '🎂 お誕生日おめでとうございます！';
  }

  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % DAILY_MESSAGES.length;
  return DAILY_MESSAGES[index];
};

export interface StreakInfo {
  message: string;
  emoji: string;
}

/**
 * ストリーク（連続記録）の情報を取得
 * @param days 連続記録日数
 */
export const getStreakInfo = (days: number): StreakInfo => {
  // 絵文字はマイルストーンに応じて変化（達成感を演出）
  let emoji = '📝';
  if (days >= 365) {
    emoji = '🏆';
  } else if (days >= 100) {
    emoji = '💎';
  } else if (days >= 30) {
    emoji = '🌟';
  } else if (days >= 14) {
    emoji = '✨';
  } else if (days >= 7) {
    emoji = '🎉';
  } else if (days >= 3) {
    emoji = '🔥';
  }

  return { message: `${days}日間連続`, emoji };
};

export type CelebrationMessage = typeof CELEBRATION_MESSAGES[number];
export type RestartMessage = typeof RESTART_MESSAGES[number];

/**
 * ランダムに祝福メッセージを取得
 */
export const getRandomCelebration = (): CelebrationMessage => {
  const index = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
  return CELEBRATION_MESSAGES[index];
};

/**
 * ランダムに再開メッセージを取得
 */
export const getRandomRestartMessage = (): RestartMessage => {
  const index = Math.floor(Math.random() * RESTART_MESSAGES.length);
  return RESTART_MESSAGES[index];
};
