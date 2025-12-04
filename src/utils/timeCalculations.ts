/**
 * 時間計算のユーティリティ関数
 */

export interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number; // 日のみ表示用(小数点以下含む)
  totalWeeks: number; // 週のみ表示用(小数点以下含む)
  totalYears: number; // 年のみ表示用(小数点以下含む)
}

/**
 * 誕生日と目標寿命から目標日を計算する
 */
export const calculateTargetDate = (
  birthday: string,
  targetLifespan: number
): Date => {
  const [year, month, day] = birthday.split('-').map(Number);
  return new Date(year + targetLifespan, month - 1, day, 0, 0, 0, 0);
};

/**
 * 誕生日文字列からDateオブジェクトを生成する
 */
export const parseBirthday = (birthday: string): Date => {
  const [year, month, day] = birthday.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * 目標日までの残り時間を計算する
 */
export const calculateTimeLeft = (
  birthday: string,
  targetLifespan: number
): TimeLeft => {
  const now = new Date();
  const targetDate = calculateTargetDate(birthday, targetLifespan);

  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
      totalWeeks: 0,
      totalYears: 0,
    };
  }

  // ミリ秒から各単位に変換
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  // 年と月の計算（正確な日数を考慮）
  let months = 0;
  let tempDate = new Date(now);

  while (
    tempDate.getFullYear() < targetDate.getFullYear() ||
    (tempDate.getFullYear() === targetDate.getFullYear() &&
      tempDate.getMonth() < targetDate.getMonth())
  ) {
    tempDate.setMonth(tempDate.getMonth() + 1);
    if (tempDate <= targetDate) {
      months++;
    }
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  // 残りの日数を計算
  tempDate = new Date(now);
  tempDate.setFullYear(tempDate.getFullYear() + years);
  tempDate.setMonth(tempDate.getMonth() + remainingMonths);
  const remainingMs = targetDate.getTime() - tempDate.getTime();
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));

  // 総日数、週数、年数の計算
  const totalDays = diffMs / (1000 * 60 * 60 * 24);
  const totalWeeks = totalDays / 7;
  const totalYears = totalDays / 365.25;

  return {
    years,
    months: remainingMonths,
    days: remainingDays,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60,
    totalDays,
    totalWeeks,
    totalYears,
  };
};

/**
 * 人生の進捗率を計算する（0-100）
 */
export const calculateLifeProgress = (
  birthday: string,
  targetLifespan: number
): number => {
  const now = new Date();
  const birthdayDate = parseBirthday(birthday);
  const targetDate = calculateTargetDate(birthday, targetLifespan);

  const totalLifeMs = targetDate.getTime() - birthdayDate.getTime();
  const livedMs = now.getTime() - birthdayDate.getTime();
  const progress = (livedMs / totalLifeMs) * 100;

  return Math.min(Math.max(progress, 0), 100);
};

/**
 * 現在の年齢を計算する（小数点以下含む）
 */
export const calculateCurrentAge = (birthday: string): number => {
  const now = new Date();
  const birthdayDate = parseBirthday(birthday);

  const diffMs = now.getTime() - birthdayDate.getTime();
  const ageInYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  return Math.max(0, ageInYears);
};
